use git2::{BranchType, Repository};
use serde::{Deserialize, Serialize};
use std::path::Path;
use std::process::Command;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Worktree {
    pub path: String,
    pub branch: String,
    pub is_main: bool,
    pub is_bare: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Branch {
    pub name: String,
    pub is_remote: bool,
    pub is_head: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WorktreeStatus {
    pub has_changes: bool,
    pub staged: i32,
    pub unstaged: i32,
    pub untracked: i32,
}

// ============ Worktree Commands ============

#[tauri::command]
pub fn get_worktrees(repo_path: String) -> Result<Vec<Worktree>, String> {
    let output = Command::new("git")
        .args(["worktree", "list", "--porcelain"])
        .current_dir(&repo_path)
        .output()
        .map_err(|e| format!("Failed to run git: {}", e))?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut worktrees = Vec::new();
    let mut current_path: Option<String> = None;
    let mut current_branch: Option<String> = None;
    let mut is_bare = false;

    for line in stdout.lines() {
        if line.starts_with("worktree ") {
            // Save previous worktree if exists
            if let Some(path) = current_path.take() {
                worktrees.push(Worktree {
                    path: path.clone(),
                    branch: current_branch.take().unwrap_or_default(),
                    is_main: worktrees.is_empty(),
                    is_bare,
                });
                is_bare = false;
            }
            current_path = Some(line.strip_prefix("worktree ").unwrap().to_string());
        } else if line.starts_with("branch ") {
            let branch = line.strip_prefix("branch refs/heads/").unwrap_or(
                line.strip_prefix("branch ").unwrap_or("")
            );
            current_branch = Some(branch.to_string());
        } else if line == "bare" {
            is_bare = true;
        }
    }

    // Don't forget the last one
    if let Some(path) = current_path {
        worktrees.push(Worktree {
            path,
            branch: current_branch.unwrap_or_default(),
            is_main: worktrees.is_empty(),
            is_bare,
        });
    }

    Ok(worktrees)
}

#[tauri::command]
pub async fn create_worktree(
    repo_path: String,
    worktree_path: String,
    branch_name: String,
    base_branch: String,
) -> Result<(), String> {
    tokio::task::spawn_blocking(move || {
        let output = Command::new("git")
            .args(["worktree", "add", "-b", &branch_name, &worktree_path, &base_branch])
            .current_dir(&repo_path)
            .output()
            .map_err(|e| format!("Failed to run git: {}", e))?;

        if !output.status.success() {
            return Err(String::from_utf8_lossy(&output.stderr).to_string());
        }

        // When base_branch is a remote branch (e.g., origin/main), git automatically
        // sets up the new branch to track that remote branch. This causes pushes to
        // go to the base branch instead of origin/<new-branch>. Remove the upstream
        // tracking to fix this behavior.
        let _ = Command::new("git")
            .args(["branch", "--unset-upstream", &branch_name])
            .current_dir(&worktree_path)
            .output();

        Ok(())
    })
    .await
    .map_err(|e| format!("Task failed: {}", e))?
}

#[tauri::command]
pub async fn create_worktree_existing_branch(
    repo_path: String,
    worktree_path: String,
    branch_name: String,
) -> Result<(), String> {
    tokio::task::spawn_blocking(move || {
        let output = Command::new("git")
            .args(["worktree", "add", &worktree_path, &branch_name])
            .current_dir(&repo_path)
            .output()
            .map_err(|e| format!("Failed to run git: {}", e))?;

        if !output.status.success() {
            return Err(String::from_utf8_lossy(&output.stderr).to_string());
        }

        Ok(())
    })
    .await
    .map_err(|e| format!("Task failed: {}", e))?
}

#[tauri::command]
pub async fn remove_worktree(
    repo_path: String,
    worktree_path: String,
    force: bool,
    delete_branch: bool,
    branch_name: Option<String>,
) -> Result<(), String> {
    tokio::task::spawn_blocking(move || {
        let mut args = vec!["worktree", "remove"];
        if force {
            args.push("--force");
        }
        args.push(&worktree_path);

        let output = Command::new("git")
            .args(&args)
            .current_dir(&repo_path)
            .output()
            .map_err(|e| format!("Failed to run git: {}", e))?;

        if !output.status.success() {
            return Err(String::from_utf8_lossy(&output.stderr).to_string());
        }

        // Delete the branch after worktree removal if requested
        if delete_branch {
            if let Some(branch) = branch_name {
                // Use -D (force) since the branch may not be fully merged
                let flag = if force { "-D" } else { "-d" };
                let output = Command::new("git")
                    .args(["branch", flag, &branch])
                    .current_dir(&repo_path)
                    .output()
                    .map_err(|e| format!("Worktree removed but failed to delete branch: {}", e))?;

                if !output.status.success() {
                    let stderr = String::from_utf8_lossy(&output.stderr);
                    // If soft delete fails, try force delete
                    if !force && stderr.contains("not fully merged") {
                        let output = Command::new("git")
                            .args(["branch", "-D", &branch])
                            .current_dir(&repo_path)
                            .output()
                            .map_err(|e| format!("Worktree removed but failed to force delete branch: {}", e))?;

                        if !output.status.success() {
                            return Err(format!(
                                "Worktree removed but failed to delete branch: {}",
                                String::from_utf8_lossy(&output.stderr)
                            ));
                        }
                    } else {
                        return Err(format!(
                            "Worktree removed but failed to delete branch: {}",
                            stderr
                        ));
                    }
                }
            }
        }

        Ok(())
    })
    .await
    .map_err(|e| format!("Task failed: {}", e))?
}

#[tauri::command]
pub fn prune_worktrees(repo_path: String) -> Result<(), String> {
    let output = Command::new("git")
        .args(["worktree", "prune"])
        .current_dir(&repo_path)
        .output()
        .map_err(|e| format!("Failed to run git: {}", e))?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }

    Ok(())
}

#[tauri::command]
pub fn get_worktree_status(worktree_path: String) -> Result<WorktreeStatus, String> {
    let output = Command::new("git")
        .args(["status", "--porcelain"])
        .current_dir(&worktree_path)
        .output()
        .map_err(|e| format!("Failed to run git: {}", e))?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut staged = 0;
    let mut unstaged = 0;
    let mut untracked = 0;

    for line in stdout.lines() {
        if line.len() < 2 {
            continue;
        }
        let index = line.chars().next().unwrap_or(' ');
        let worktree = line.chars().nth(1).unwrap_or(' ');

        if index == '?' {
            untracked += 1;
        } else {
            if index != ' ' {
                staged += 1;
            }
            if worktree != ' ' {
                unstaged += 1;
            }
        }
    }

    Ok(WorktreeStatus {
        has_changes: staged > 0 || unstaged > 0 || untracked > 0,
        staged,
        unstaged,
        untracked,
    })
}

// ============ Branch Commands ============

#[tauri::command]
pub fn get_branches(repo_path: String, include_remote: bool) -> Result<Vec<Branch>, String> {
    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;
    let mut branches_vec = Vec::new();

    // Get local branches
    let local_branches = repo.branches(Some(BranchType::Local)).map_err(|e| e.to_string())?;
    for branch_result in local_branches {
        let (branch, _) = branch_result.map_err(|e| e.to_string())?;
        let name = branch.name().map_err(|e| e.to_string())?;
        if let Some(name) = name {
            branches_vec.push(Branch {
                name: name.to_string(),
                is_remote: false,
                is_head: branch.is_head(),
            });
        }
    }

    // Get remote branches if requested
    if include_remote {
        let remote_branches = repo.branches(Some(BranchType::Remote)).map_err(|e| e.to_string())?;
        for branch_result in remote_branches {
            let (branch, _) = branch_result.map_err(|e| e.to_string())?;
            let name = branch.name().map_err(|e| e.to_string())?;
            if let Some(name) = name {
                branches_vec.push(Branch {
                    name: name.to_string(),
                    is_remote: true,
                    is_head: false,
                });
            }
        }
    }

    Ok(branches_vec)
}

#[tauri::command]
pub fn get_current_branch(repo_path: String) -> Result<String, String> {
    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;
    let head = repo.head().map_err(|e| e.to_string())?;

    if head.is_branch() {
        head.shorthand()
            .map(|s| s.to_string())
            .ok_or_else(|| "Could not get branch name".to_string())
    } else {
        Err("HEAD is not a branch".to_string())
    }
}

#[tauri::command]
pub fn get_default_branch(repo_path: String) -> Result<String, String> {
    // Try to find origin/HEAD or origin/main or origin/master
    let output = Command::new("git")
        .args(["symbolic-ref", "refs/remotes/origin/HEAD", "--short"])
        .current_dir(&repo_path)
        .output()
        .map_err(|e| format!("Failed to run git: {}", e))?;

    if output.status.success() {
        let branch = String::from_utf8_lossy(&output.stdout).trim().to_string();
        return Ok(branch);
    }

    // Fallback: check if origin/main exists
    let output = Command::new("git")
        .args(["rev-parse", "--verify", "origin/main"])
        .current_dir(&repo_path)
        .output()
        .map_err(|e| format!("Failed to run git: {}", e))?;

    if output.status.success() {
        return Ok("origin/main".to_string());
    }

    // Fallback: check if origin/master exists
    let output = Command::new("git")
        .args(["rev-parse", "--verify", "origin/master"])
        .current_dir(&repo_path)
        .output()
        .map_err(|e| format!("Failed to run git: {}", e))?;

    if output.status.success() {
        return Ok("origin/master".to_string());
    }

    Err("Could not determine default branch".to_string())
}

#[tauri::command]
pub fn delete_branch(repo_path: String, branch_name: String, force: bool) -> Result<(), String> {
    let flag = if force { "-D" } else { "-d" };

    let output = Command::new("git")
        .args(["branch", flag, &branch_name])
        .current_dir(&repo_path)
        .output()
        .map_err(|e| format!("Failed to run git: {}", e))?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }

    Ok(())
}

#[tauri::command]
pub fn rename_branch(repo_path: String, old_name: String, new_name: String) -> Result<(), String> {
    let output = Command::new("git")
        .args(["branch", "-m", &old_name, &new_name])
        .current_dir(&repo_path)
        .output()
        .map_err(|e| format!("Failed to run git: {}", e))?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }

    Ok(())
}

// ============ Git Operations ============

#[tauri::command]
pub async fn git_fetch(repo_path: String) -> Result<(), String> {
    tokio::task::spawn_blocking(move || {
        let output = Command::new("git")
            .args(["fetch", "--all", "--prune"])
            .current_dir(&repo_path)
            .output()
            .map_err(|e| format!("Failed to run git: {}", e))?;

        if !output.status.success() {
            return Err(String::from_utf8_lossy(&output.stderr).to_string());
        }

        Ok(())
    })
    .await
    .map_err(|e| format!("Task failed: {}", e))?
}

#[tauri::command]
pub async fn git_pull(worktree_path: String) -> Result<(), String> {
    tokio::task::spawn_blocking(move || {
        let output = Command::new("git")
            .args(["pull"])
            .current_dir(&worktree_path)
            .output()
            .map_err(|e| format!("Failed to run git: {}", e))?;

        if !output.status.success() {
            return Err(String::from_utf8_lossy(&output.stderr).to_string());
        }

        Ok(())
    })
    .await
    .map_err(|e| format!("Task failed: {}", e))?
}

// ============ Remote Info ============

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GitHubRemoteInfo {
    pub owner: String,
    pub repo: String,
}

#[tauri::command]
pub fn get_github_remote_info(repo_path: String) -> Result<Option<GitHubRemoteInfo>, String> {
    let output = Command::new("git")
        .args(["remote", "get-url", "origin"])
        .current_dir(&repo_path)
        .output()
        .map_err(|e| format!("Failed to run git: {}", e))?;

    if !output.status.success() {
        return Ok(None);
    }

    let url = String::from_utf8_lossy(&output.stdout).trim().to_string();

    // Parse GitHub URL formats:
    // SSH: git@github.com:owner/repo.git
    // HTTPS: https://github.com/owner/repo.git
    // HTTPS (no .git): https://github.com/owner/repo

    let parsed = if url.starts_with("git@github.com:") {
        // SSH format
        url.strip_prefix("git@github.com:")
            .and_then(|s| s.strip_suffix(".git").or(Some(s)))
            .and_then(|s| {
                let parts: Vec<&str> = s.split('/').collect();
                if parts.len() == 2 {
                    Some((parts[0].to_string(), parts[1].to_string()))
                } else {
                    None
                }
            })
    } else if url.contains("github.com/") {
        // HTTPS format
        url.split("github.com/")
            .nth(1)
            .and_then(|s| s.strip_suffix(".git").or(Some(s)))
            .and_then(|s| {
                let parts: Vec<&str> = s.split('/').collect();
                if parts.len() >= 2 {
                    Some((parts[0].to_string(), parts[1].to_string()))
                } else {
                    None
                }
            })
    } else {
        None
    };

    Ok(parsed.map(|(owner, repo)| GitHubRemoteInfo { owner, repo }))
}

// ============ IDE/File Operations ============

#[tauri::command]
pub fn open_ide(path: String, ide_preset: String, custom_command: Option<String>) -> Result<(), String> {
    let is_custom = ide_preset == "custom";
    let command = match ide_preset.as_str() {
        "code" => "code",
        "cursor" => "cursor",
        "idea" => "idea",
        "webstorm" => "webstorm",
        "pycharm" => "pycharm",
        "goland" => "goland",
        "custom" => custom_command.as_deref().ok_or("No custom command provided")?,
        _ => return Err(format!("Unknown IDE preset: {}", ide_preset)),
    };

    // Use login shell to access user's PATH environment
    // GUI apps don't inherit terminal PATH, so we need -l flag to load shell profile
    let shell_cmd = format!("{} \"{}\"", command, path);

    #[cfg(target_os = "macos")]
    let shell = "/bin/zsh";
    #[cfg(not(target_os = "macos"))]
    let shell = "sh";

    if is_custom {
        // For custom commands, wait for completion and check status
        let output = Command::new(shell)
            .args(["-l", "-c", &shell_cmd])
            .output()
            .map_err(|e| format!("Failed to run custom command: {}", e))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            let stdout = String::from_utf8_lossy(&output.stdout);
            let error_msg = if !stderr.is_empty() {
                stderr.to_string()
            } else if !stdout.is_empty() {
                stdout.to_string()
            } else {
                format!("Command exited with status: {}", output.status)
            };
            return Err(error_msg);
        }
    } else {
        // For preset IDEs, spawn without waiting (they stay open)
        Command::new(shell)
            .args(["-l", "-c", &shell_cmd])
            .spawn()
            .map_err(|e| format!("Failed to open IDE: {}", e))?;
    }

    Ok(())
}

#[tauri::command]
pub fn open_in_finder(path: String) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Failed to open Finder: {}", e))?;
    }

    #[cfg(target_os = "windows")]
    {
        Command::new("explorer")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Failed to open Explorer: {}", e))?;
    }

    #[cfg(target_os = "linux")]
    {
        Command::new("xdg-open")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Failed to open file manager: {}", e))?;
    }

    Ok(())
}

#[tauri::command]
pub fn open_terminal(path: String) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .args(["-a", "Terminal", &path])
            .spawn()
            .map_err(|e| format!("Failed to open Terminal: {}", e))?;
    }

    #[cfg(target_os = "windows")]
    {
        Command::new("cmd")
            .args(["/c", "start", "cmd", "/k", &format!("cd /d {}", path)])
            .spawn()
            .map_err(|e| format!("Failed to open Command Prompt: {}", e))?;
    }

    #[cfg(target_os = "linux")]
    {
        // Try common terminal emulators
        let terminals = ["gnome-terminal", "konsole", "xterm"];
        for term in terminals {
            if Command::new("which")
                .arg(term)
                .output()
                .map(|o| o.status.success())
                .unwrap_or(false)
            {
                Command::new(term)
                    .arg("--working-directory")
                    .arg(&path)
                    .spawn()
                    .map_err(|e| format!("Failed to open terminal: {}", e))?;
                return Ok(());
            }
        }
        return Err("No supported terminal emulator found".to_string());
    }

    Ok(())
}

#[tauri::command]
pub fn copy_paths_to_worktree(
    source_path: String,
    target_path: String,
    paths: Vec<String>,
) -> Result<(), String> {
    for rel_path in paths {
        let src = Path::new(&source_path).join(&rel_path);
        let dst = Path::new(&target_path).join(&rel_path);

        if !src.exists() {
            continue; // Skip if source doesn't exist
        }

        // Create parent directory if needed
        if let Some(parent) = dst.parent() {
            std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }

        if src.is_dir() {
            copy_dir_recursive(&src, &dst)?;
        } else {
            std::fs::copy(&src, &dst).map_err(|e| e.to_string())?;
        }
    }

    Ok(())
}

fn copy_dir_recursive(src: &Path, dst: &Path) -> Result<(), String> {
    std::fs::create_dir_all(dst).map_err(|e| e.to_string())?;

    for entry in std::fs::read_dir(src).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let src_path = entry.path();
        let dst_path = dst.join(entry.file_name());

        if src_path.is_dir() {
            copy_dir_recursive(&src_path, &dst_path)?;
        } else {
            std::fs::copy(&src_path, &dst_path).map_err(|e| e.to_string())?;
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    fn setup_test_repo() -> (TempDir, String) {
        let temp_dir = TempDir::new().expect("Failed to create temp dir");
        let repo_path = temp_dir.path().join("repo");
        fs::create_dir_all(&repo_path).expect("Failed to create repo dir");

        // Initialize git repo
        Command::new("git")
            .args(["init"])
            .current_dir(&repo_path)
            .output()
            .expect("Failed to init git repo");

        Command::new("git")
            .args(["config", "user.email", "test@test.com"])
            .current_dir(&repo_path)
            .output()
            .expect("Failed to set git email");

        Command::new("git")
            .args(["config", "user.name", "Test User"])
            .current_dir(&repo_path)
            .output()
            .expect("Failed to set git name");

        // Create initial commit
        fs::write(repo_path.join("README.md"), "# Test").expect("Failed to write README");
        Command::new("git")
            .args(["add", "-A"])
            .current_dir(&repo_path)
            .output()
            .expect("Failed to git add");
        Command::new("git")
            .args(["commit", "-m", "Initial commit"])
            .current_dir(&repo_path)
            .output()
            .expect("Failed to git commit");

        let repo_path_str = repo_path.to_string_lossy().to_string();
        (temp_dir, repo_path_str)
    }

    #[test]
    fn test_get_worktrees_initial() {
        let (_temp_dir, repo_path) = setup_test_repo();

        let worktrees = get_worktrees(repo_path).expect("Failed to get worktrees");

        assert_eq!(worktrees.len(), 1);
        assert!(worktrees[0].is_main);
    }

    #[test]
    fn test_create_and_get_worktree() {
        let (temp_dir, repo_path) = setup_test_repo();
        let worktree_path = temp_dir.path().join("worktrees/feature-test");

        // Create worktree
        create_worktree(
            repo_path.clone(),
            worktree_path.to_string_lossy().to_string(),
            "feature-test".to_string(),
            "main".to_string(),
        )
        .expect("Failed to create worktree");

        // Verify worktree exists
        let worktrees = get_worktrees(repo_path).expect("Failed to get worktrees");
        assert_eq!(worktrees.len(), 2);

        let feature_wt = worktrees.iter().find(|w| w.branch == "feature-test");
        assert!(feature_wt.is_some());
        assert!(!feature_wt.unwrap().is_main);
    }

    #[test]
    fn test_create_worktree_existing_branch() {
        let (temp_dir, repo_path) = setup_test_repo();

        // Create a branch first
        Command::new("git")
            .args(["branch", "existing-branch"])
            .current_dir(&repo_path)
            .output()
            .expect("Failed to create branch");

        let worktree_path = temp_dir.path().join("worktrees/existing-branch");

        // Create worktree from existing branch
        create_worktree_existing_branch(
            repo_path.clone(),
            worktree_path.to_string_lossy().to_string(),
            "existing-branch".to_string(),
        )
        .expect("Failed to create worktree from existing branch");

        // Verify
        let worktrees = get_worktrees(repo_path).expect("Failed to get worktrees");
        assert_eq!(worktrees.len(), 2);

        let existing_wt = worktrees.iter().find(|w| w.branch == "existing-branch");
        assert!(existing_wt.is_some());
    }

    #[test]
    fn test_remove_worktree() {
        let (temp_dir, repo_path) = setup_test_repo();
        let worktree_path = temp_dir.path().join("worktrees/to-delete");

        // Create worktree
        create_worktree(
            repo_path.clone(),
            worktree_path.to_string_lossy().to_string(),
            "to-delete".to_string(),
            "main".to_string(),
        )
        .expect("Failed to create worktree");

        // Verify it exists
        let worktrees = get_worktrees(repo_path.clone()).expect("Failed to get worktrees");
        assert_eq!(worktrees.len(), 2);

        // Remove worktree
        remove_worktree(
            repo_path.clone(),
            worktree_path.to_string_lossy().to_string(),
            false,
            false,
            None,
        )
        .expect("Failed to remove worktree");

        // Verify it's gone
        let worktrees = get_worktrees(repo_path).expect("Failed to get worktrees");
        assert_eq!(worktrees.len(), 1);
    }

    #[test]
    fn test_remove_worktree_force() {
        let (temp_dir, repo_path) = setup_test_repo();
        let worktree_path = temp_dir.path().join("worktrees/dirty-wt");

        // Create worktree
        create_worktree(
            repo_path.clone(),
            worktree_path.to_string_lossy().to_string(),
            "dirty-wt".to_string(),
            "main".to_string(),
        )
        .expect("Failed to create worktree");

        // Make it dirty (uncommitted changes)
        fs::write(worktree_path.join("dirty.txt"), "uncommitted").expect("Failed to write dirty file");

        // Try to remove without force - should fail
        let result = remove_worktree(
            repo_path.clone(),
            worktree_path.to_string_lossy().to_string(),
            false,
            false,
            None,
        );
        assert!(result.is_err());

        // Remove with force - should succeed
        remove_worktree(
            repo_path.clone(),
            worktree_path.to_string_lossy().to_string(),
            true,
            false,
            None,
        )
        .expect("Failed to force remove worktree");

        // Verify it's gone
        let worktrees = get_worktrees(repo_path).expect("Failed to get worktrees");
        assert_eq!(worktrees.len(), 1);
    }

    #[test]
    fn test_get_worktree_status_clean() {
        let (_temp_dir, repo_path) = setup_test_repo();

        let status = get_worktree_status(repo_path).expect("Failed to get status");

        assert!(!status.has_changes);
        assert_eq!(status.staged, 0);
        assert_eq!(status.unstaged, 0);
        assert_eq!(status.untracked, 0);
    }

    #[test]
    fn test_get_worktree_status_dirty() {
        let (_temp_dir, repo_path) = setup_test_repo();

        // Create untracked file
        fs::write(Path::new(&repo_path).join("untracked.txt"), "untracked").expect("Failed to write");

        // Create modified file
        fs::write(Path::new(&repo_path).join("README.md"), "# Modified").expect("Failed to modify");

        let status = get_worktree_status(repo_path).expect("Failed to get status");

        assert!(status.has_changes);
        assert_eq!(status.untracked, 1);
        assert_eq!(status.unstaged, 1);
    }

    #[test]
    fn test_get_branches() {
        let (_temp_dir, repo_path) = setup_test_repo();

        // Create additional branches
        Command::new("git")
            .args(["branch", "feature-1"])
            .current_dir(&repo_path)
            .output()
            .expect("Failed to create branch");
        Command::new("git")
            .args(["branch", "feature-2"])
            .current_dir(&repo_path)
            .output()
            .expect("Failed to create branch");

        let branches = get_branches(repo_path, false).expect("Failed to get branches");

        assert!(branches.len() >= 3); // main + feature-1 + feature-2
        assert!(branches.iter().any(|b| b.name == "main" || b.name == "master"));
        assert!(branches.iter().any(|b| b.name == "feature-1"));
        assert!(branches.iter().any(|b| b.name == "feature-2"));
    }

    #[test]
    fn test_rename_branch() {
        let (_temp_dir, repo_path) = setup_test_repo();

        // Create a branch
        Command::new("git")
            .args(["branch", "old-name"])
            .current_dir(&repo_path)
            .output()
            .expect("Failed to create branch");

        // Rename it
        rename_branch(repo_path.clone(), "old-name".to_string(), "new-name".to_string())
            .expect("Failed to rename branch");

        // Verify
        let branches = get_branches(repo_path, false).expect("Failed to get branches");
        assert!(!branches.iter().any(|b| b.name == "old-name"));
        assert!(branches.iter().any(|b| b.name == "new-name"));
    }

    #[test]
    fn test_delete_branch() {
        let (_temp_dir, repo_path) = setup_test_repo();

        // Create a branch
        Command::new("git")
            .args(["branch", "to-delete"])
            .current_dir(&repo_path)
            .output()
            .expect("Failed to create branch");

        // Verify it exists
        let branches = get_branches(repo_path.clone(), false).expect("Failed to get branches");
        assert!(branches.iter().any(|b| b.name == "to-delete"));

        // Delete it
        delete_branch(repo_path.clone(), "to-delete".to_string(), false)
            .expect("Failed to delete branch");

        // Verify it's gone
        let branches = get_branches(repo_path, false).expect("Failed to get branches");
        assert!(!branches.iter().any(|b| b.name == "to-delete"));
    }
}
