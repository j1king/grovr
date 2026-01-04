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
pub fn create_worktree(
    repo_path: String,
    worktree_path: String,
    branch_name: String,
    base_branch: String,
) -> Result<(), String> {
    let output = Command::new("git")
        .args(["worktree", "add", "-b", &branch_name, &worktree_path, &base_branch])
        .current_dir(&repo_path)
        .output()
        .map_err(|e| format!("Failed to run git: {}", e))?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }

    Ok(())
}

#[tauri::command]
pub fn create_worktree_existing_branch(
    repo_path: String,
    worktree_path: String,
    branch_name: String,
) -> Result<(), String> {
    let output = Command::new("git")
        .args(["worktree", "add", &worktree_path, &branch_name])
        .current_dir(&repo_path)
        .output()
        .map_err(|e| format!("Failed to run git: {}", e))?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }

    Ok(())
}

#[tauri::command]
pub fn remove_worktree(repo_path: String, worktree_path: String, force: bool) -> Result<(), String> {
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

    Ok(())
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
pub fn git_fetch(repo_path: String) -> Result<(), String> {
    let output = Command::new("git")
        .args(["fetch", "--all", "--prune"])
        .current_dir(&repo_path)
        .output()
        .map_err(|e| format!("Failed to run git: {}", e))?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }

    Ok(())
}

#[tauri::command]
pub fn git_pull(worktree_path: String) -> Result<(), String> {
    let output = Command::new("git")
        .args(["pull"])
        .current_dir(&worktree_path)
        .output()
        .map_err(|e| format!("Failed to run git: {}", e))?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }

    Ok(())
}

// ============ IDE/File Operations ============

#[tauri::command]
pub fn open_ide(path: String, ide_preset: String, custom_command: Option<String>) -> Result<(), String> {
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

    // Use shell to access user's PATH environment
    Command::new("sh")
        .args(["-c", &format!("{} \"{}\"", command, path)])
        .spawn()
        .map_err(|e| format!("Failed to open IDE: {}", e))?;

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
