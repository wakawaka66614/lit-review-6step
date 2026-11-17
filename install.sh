#!/usr/bin/env bash
# 安装 lit-review-6step 技能包。
# 用法: ./install.sh [项目目录] [--skills-dir .claude/skills] [--global] [--with-deps]
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET="."
SKILLS_DIR=".dsh/skills"
GLOBAL=0
WITH_DEPS=0

while [ $# -gt 0 ]; do
  case "$1" in
    --global) GLOBAL=1; shift ;;
    --with-deps) WITH_DEPS=1; shift ;;
    --skills-dir) SKILLS_DIR="$2"; shift 2 ;;
    *) TARGET="$1"; shift ;;
  esac
done

if [ "$GLOBAL" -eq 1 ]; then
  SKILLS="$HOME/.dsh/skills"
  COMMANDS="$HOME/.dsh/commands"
else
  mkdir -p "$TARGET"
  TARGET="$(cd "$TARGET" && pwd)"
  SKILLS="$TARGET/$SKILLS_DIR"
  COMMANDS="$(dirname "$SKILLS")/commands"
fi

mkdir -p "$SKILLS" "$COMMANDS"
echo "目标: $SKILLS"

for name in lit-review-6step survey-writing survey-abstract shared; do
  if [ ! -d "$ROOT/skills/$name" ]; then
    echo "缺少 skills/$name，仓库不完整" >&2
    exit 1
  fi
  if [ -d "$SKILLS/$name" ]; then
    BAK="$SKILLS/$name.bak-$(date +%Y%m%d-%H%M%S)"
    mv "$SKILLS/$name" "$BAK"
    echo "  已备份旧版本: $(basename "$BAK")"
  fi
  cp -R "$ROOT/skills/$name" "$SKILLS/$name"
  echo "  已安装 skill: $name"
done

if [ "$GLOBAL" -eq 0 ] && [ -d "$ROOT/templates/文献综述项目模板" ]; then
  if [ -d "$TARGET/文献综述项目模板" ]; then
    echo "  文献综述项目模板/ 已存在，跳过"
  else
    cp -R "$ROOT/templates/文献综述项目模板" "$TARGET/文献综述项目模板"
    echo "  已安装模板: 文献综述项目模板/"
  fi
fi

if [ -d "$ROOT/commands" ]; then
  cp "$ROOT"/commands/*.md "$COMMANDS/"
  echo "  已安装命令: $COMMANDS"
fi

clone_pinned() {
  local name="$1" url="$2" sha="$3"
  if [ -d "$SKILLS/$name" ]; then
    echo "  已存在，跳过: $name"
    return 0
  fi
  echo "  下载依赖: $name @ ${sha:0:7}"
  git clone --depth 1 "$url" "$SKILLS/$name" || { echo "  警告：$name 下载失败" >&2; return 0; }
  if git -C "$SKILLS/$name" fetch --depth 1 origin "$sha" >/dev/null 2>&1 \
     && git -C "$SKILLS/$name" checkout --quiet "$sha"; then
    echo "  已锁定到 ${sha:0:7}"
  else
    echo "  警告：$name 无法切到锁定 commit，保留默认分支" >&2
  fi
}

if [ "$WITH_DEPS" -eq 1 ]; then
  if ! command -v git >/dev/null 2>&1; then
    echo "需要 git 才能下载依赖" >&2
    exit 1
  fi
  clone_pinned literature-review-skill \
    https://github.com/YANZHANLIN/literature-review-skill.git \
    7328261b9274e8647ab017a0f94a98281702ce82
  clone_pinned literature-review-skills \
    https://github.com/xingtaxueshu/literature-review-skills.git \
    5f6498d67a1a3642eafa4bb7c0a693e833d1aedb
fi

echo ""
echo "完成。新开会话说：用 lit-review-6step，从 S1 开始（或从 S2 开始，题目是 …）。"
