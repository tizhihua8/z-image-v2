# 🔄 GitHub 仓库迁移指南 (v2 → v3)

本文档指导如何将 Z-Image v2 仓库迁移到 v3，包括重命名和同步。

## 📋 迁移前准备

### 1. 备份现有数据

```bash
# 克隆现有仓库（如果还没有）
git clone https://github.com/tizhihua8/-z-image-v2.git z-image-v2-backup
cd z-image-v2-backup

# 备份所有分支
git branch -a
```

### 2. 检查未提交的更改

```bash
git status
git log --oneline -10
```

---

## 🚀 方案 A: 创建新仓库（推荐）

### 步骤 1: 在 GitHub 创建新仓库

1. 访问 https://github.com/new
2. 仓库名称: `z-image-v3`
3. 可见性: Public
4. **不要**初始化 README、.gitignore 或 license
5. 点击 "Create repository"

### 步骤 2: 本地重命名项目

```bash
# 进入项目目录
cd E:\项目开发\Z-Image

# 重命名目录
mv Z-Image-v2 Z-Image-v3
cd Z-Image-v3
```

### 步骤 3: 更新版本引用

在以下文件中更新版本号：

```bash
# README.md
sed -i 's/Z-Image-v2/Z-Image-v3/g' README.md

# package.json (如果有版本号)
# 手动编辑 web/package.json，更新 version 字段
```

### 步骤 4: 更新 Git 远程地址

```bash
# 删除旧的远程地址
git remote remove origin

# 添加新的远程地址
git remote add origin https://github.com/tizhihua8/z-image-v3.git

# 或使用 SSH:
# git remote add origin git@github.com:tizhihua8/z-image-v3.git
```

### 步骤 5: 推送到新仓库

```bash
# 推送所有分支
git push -u origin --all

# 推送所有标签
git push -u origin --tags
```

### 步骤 6: 设置默认分支

1. 访问新仓库: https://github.com/tizhihua8/z-image-v3
2. Settings → Branches
3. 将默认分支设置为 `main`（或你的主分支名）

---

## 🔄 方案 B: 重命名现有仓库

### 步骤 1: 在 GitHub 重命名仓库

1. 访问现有仓库: https://github.com/tizhihua8/-z-image-v2
2. Settings → General
3. Repository name: `z-image-v3`
4. 点击 "Rename"

⚠️ **注意**: GitHub 会自动设置从旧名称到新名称的重定向

### 步骤 2: 更新本地 Git 配置

```bash
cd Z-Image-v2

# 更新远程 URL
git remote set-url origin https://github.com/tizhihua8/z-image-v3.git

# 验证
git remote -v
```

### 步骤 3: 重命名本地目录

```bash
cd ..
mv Z-Image-v2 Z-Image-v3
```

---

## 📝 迁移后任务清单

### 必须完成的任务

- [ ] 更新 README.md 中的仓库链接
- [ ] 更新文档中的引用（DEPLOY.md, DOCKER_DEPLOY.md 等）
- [ ] 更新 Docker 镜像名称（如果有）
- [ ] 通知协作者新的仓库地址
- [ ] 更新 GitHub Actions 工作流（如果使用）
- [ ] 检查 CI/CD 配置

### 可选任务

- [ ] 迁移 Issues（使用 GitHub CLI）
- [ ] 迁移 Wiki（手动复制或使用工具）
- [ ] 设置 GitHub Pages（文档站点）
- [ ] 配置 GitHub Discussions
- [ ] 更新项目标签和里程碑
- [ ] 设置分支保护规则

---

## 🔗 更新外部引用

### 需要更新的地方

1. **其他项目的依赖声明**
   - package.json
   - requirements.txt
   - go.mod 等

2. **文档和教程**
   - 博客文章
   - 视频教程描述
   - Stack Overflow 回答

3. **社交媒体**
   - Twitter/X 个人简介
   - LinkedIn 简介
   - 技术论坛签名

4. **开发工具**
   - IDE 中的书签
   - Postman 集合
   - 监控服务配置

---

## 📊 迁移 Issues（可选）

### 使用 GitHub CLI

```bash
# 安装 GitHub CLI
# https://cli.github.com/

# 登录
gh auth login

# 迁移 Issues（从旧仓库到新仓库）
gh issue migrate \
  --source tizhihua8/-z-image-v2 \
  --target tizhihua8/z-image-v3 \
  --lock
```

### 手动迁移

1. 在旧仓库中，Settings → Options
2. 找到 "Migrate Issues"
3. 选择目标仓库
4. 确认迁移

---

## 🔐 迁移后安全检查

1. **检查 Secrets 和 Tokens**

```bash
# Settings → Secrets and variables → Actions
# 确保所有敏感信息已迁移
```

2. **检查 Webhooks**

```bash
# Settings → Webhooks
# 重新配置需要的 webhooks
```

3. **检查 Deploy Keys**

```bash
# Settings → Deploy keys
# 添加部署密钥（如果需要）
```

---

## 📢 通知用户

迁移完成后，建议在以下地方发布公告：

1. **旧仓库 README**: 添加迁移通知
2. **Linux DO 论坛**: 发布迁移公告
3. **社交媒体**: Twitter/X, 微博等
4. **项目网站**: 更新链接

### 迁移通知模板

```markdown
# 📢 仓库迁移通知

Z-Image 已迁移到新仓库！

**新地址**: https://github.com/tizhihua8/z-image-v3

**变更**:
- ✨ 新增 Docker 容器化部署
- 📝 更完善的文档
- 🚀 一键部署脚本

旧仓库 `-z-image-v2` 将不再维护，请尽快切换到新仓库。

如有问题，请在新仓库提交 Issue。
```

---

## ✅ 验证迁移

### 检查清单

```bash
# 1. 验证远程连接
git remote -v
git fetch origin

# 2. 验证分支完整性
git branch -a

# 3. 验证标签完整性
git tag

# 4. 验证提交历史
git log --oneline --graph --all

# 5. 测试克隆
git clone https://github.com/tizhihua8/z-image-v3.git /tmp/test-zimage-v3
```

---

## 🆘 常见问题

### Q: 迁移后 Git 出现 "detached HEAD"？

```bash
# 切换到主分支
git checkout main
# 或
git checkout master
```

### Q: 如何保留旧的 Issues 评论？

使用 GitHub CLI 的 `gh issue migrate` 命令，或者手动复制重要内容。

### Q: 迁移后 CI/CD 失败？

检查 GitHub Actions 配置文件中的仓库引用是否更新。

### Q: 如何处理旧的 Releases？

在新仓库中重新创建 Release，或使用工具迁移。

---

## 📚 相关资源

- [GitHub 官方仓库重命名指南](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/managing-repository-settings/rename-a-repository)
- [GitHub CLI 文档](https://cli.github.com/manual/)
- [仓库迁移最佳实践](https://github.com/community/community/discussions)

---

迁移完成后，请更新本文档中的示例链接为你的实际仓库地址。
