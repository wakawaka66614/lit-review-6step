<#
.SYNOPSIS
  安装 lit-review-6step 技能包。

.PARAMETER Target
  项目根目录，默认当前目录。

.PARAMETER SkillsDir
  技能目录，默认 .dsh\skills；Claude Code 用 .claude\skills。

.PARAMETER Global
  装到用户级 %USERPROFILE%\.dsh\skills，所有项目可用。

.PARAMETER WithDeps
  下载两个 MIT 依赖，并锁定到固定 commit。

.EXAMPLE
  .\install.ps1 -Target C:\work\my-paper -WithDeps

.EXAMPLE
  .\install.ps1 -Target C:\work\my-paper -SkillsDir .claude\skills -WithDeps

.EXAMPLE
  .\install.ps1 -Global -WithDeps
#>
param(
    [string]$Target = ".",
    [string]$SkillsDir = ".dsh\skills",
    [switch]$Global,
    [switch]$WithDeps
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

if ($Global) {
    $target = $env:USERPROFILE
    $skillsRoot = Join-Path $env:USERPROFILE ".dsh\skills"
    $commandsRoot = Join-Path $env:USERPROFILE ".dsh\commands"
} else {
    if (-not (Test-Path -LiteralPath $Target)) {
        New-Item -ItemType Directory -Force -Path $Target | Out-Null
    }
    $target = (Resolve-Path -LiteralPath $Target).Path
    $skillsRoot = Join-Path $target $SkillsDir
    $commandsRoot = Join-Path (Split-Path -Parent $skillsRoot) "commands"
}

Write-Host "目标: $skillsRoot"
New-Item -ItemType Directory -Force -Path $skillsRoot | Out-Null

foreach ($name in @("lit-review-6step", "survey-writing", "survey-abstract", "shared")) {
    $src = Join-Path $root "skills\$name"
    if (-not (Test-Path -LiteralPath $src)) { throw "缺少 skills\$name，仓库不完整" }
    $dst = Join-Path $skillsRoot $name
    if (Test-Path -LiteralPath $dst) {
        $bak = "$dst.bak-" + (Get-Date -Format "yyyyMMdd-HHmmss")
        Move-Item -LiteralPath $dst -Destination $bak
        Write-Host "  已备份旧版本: $bak"
    }
    Copy-Item -LiteralPath $src -Destination $dst -Recurse -Force
    Write-Host "  已安装 skill: $name"
}

if (-not $Global) {
    $tplSrc = Join-Path $root "templates\文献综述项目模板"
    $tplDst = Join-Path $target "文献综述项目模板"
    if (Test-Path -LiteralPath $tplSrc) {
        if (Test-Path -LiteralPath $tplDst) {
            Write-Warning "文献综述项目模板/ 已存在，跳过（避免覆盖你的项目）"
        } else {
            Copy-Item -LiteralPath $tplSrc -Destination $tplDst -Recurse -Force
            Write-Host "  已安装模板: 文献综述项目模板/"
        }
    }
}

$cmdSrc = Join-Path $root "commands"
if (Test-Path -LiteralPath $cmdSrc) {
    New-Item -ItemType Directory -Force -Path $commandsRoot | Out-Null
    Copy-Item -Path (Join-Path $cmdSrc "*") -Destination $commandsRoot -Force
    Write-Host "  已安装命令: $commandsRoot"
}

if ($WithDeps) {
    if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
        throw "需要 git 才能下载依赖"
    }
    # 锁定到验证过的 commit
    $deps = @(
        @{ name = "literature-review-skill";  url = "https://github.com/YANZHANLIN/literature-review-skill.git";  sha = "7328261b9274e8647ab017a0f94a98281702ce82" },
        @{ name = "literature-review-skills"; url = "https://github.com/xingtaxueshu/literature-review-skills.git"; sha = "5f6498d67a1a3642eafa4bb7c0a693e833d1aedb" }
    )
    foreach ($dep in $deps) {
        $dst = Join-Path $skillsRoot $dep.name
        if (Test-Path -LiteralPath $dst) {
            Write-Host "  已存在，跳过: $($dep.name)"
            continue
        }
        Write-Host "  下载依赖: $($dep.name) @ $($dep.sha.Substring(0, 7))"
        git clone --depth 1 $dep.url $dst
        if ($LASTEXITCODE -ne 0) { Write-Warning "下载失败: $($dep.name)"; continue }
        git -C $dst fetch --depth 1 origin $dep.sha 2>$null
        if ($LASTEXITCODE -eq 0) {
            git -C $dst checkout --quiet $dep.sha
            Write-Host "  已锁定到 $($dep.sha.Substring(0, 7))"
        } else {
            Write-Warning "$($dep.name) 无法切到锁定 commit，保留默认分支"
        }
    }
}

Write-Host ""
Write-Host "完成。新开会话说：用 lit-review-6step，从 S1 开始（或从 S2 开始，题目是 …）。"
