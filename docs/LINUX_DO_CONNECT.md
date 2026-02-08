# Linux DO Connect 接入配置指南

本文档说明如何配置 Z-Image 服务接入 Linux DO Connect OAuth 认证。

## 1. 申请应用接入

1. 访问 [Connect.Linux.Do](https://connect.linux.do)
2. 点击 **我的应用接入** → **申请新接入**
3. 填写应用信息：
   - **应用名称**: Z-Image AI 图像生成
   - **应用描述**: 基于 Z-Image-Turbo 模型的 AI 图像生成服务
   - **回调地址**: `https://your-domain.com/api/auth/callback`（生产环境）或 `http://localhost:8000/api/auth/callback`（开发环境）

4. 申请成功后，获取：
   - **Client ID**: 应用唯一标识
   - **Client Secret**: 应用密钥（请妥善保管，不要泄露）

## 2. 配置环境变量

在服务器的 `.env` 文件中配置以下环境变量：

```bash
# Linux DO Connect OAuth
LINUX_DO_CLIENT_ID=your_client_id_here
LINUX_DO_CLIENT_SECRET=your_client_secret_here
LINUX_DO_REDIRECT_URI=https://your-domain.com/api/auth/callback

# 前端 URL（OAuth 回调后重定向）
FRONTEND_URL=https://your-domain.com

# 其他配置
DEBUG=false
SECRET_KEY=your-secure-secret-key-at-least-32-chars
```

### 开发环境配置

```bash
# 开发环境
LINUX_DO_CLIENT_ID=your_dev_client_id
LINUX_DO_CLIENT_SECRET=your_dev_client_secret
LINUX_DO_REDIRECT_URI=http://localhost:8000/api/auth/callback
FRONTEND_URL=http://localhost:3000
DEBUG=true
```

## 3. 配额分配规则

根据 Linux DO 的 `trust_level`（信任等级）自动分配每日生成配额：

| Trust Level | 用户类型 | 每日配额 |
|-------------|----------|----------|
| 0 | 新用户 | 1 张 |
| 1 | 基础用户 | 1 张 |
| 2 | 成员 | 5 张 |
| 3 | 常规 | 20 张 |
| 4 | 领导者 | 20 张 |

> 注：管理员用户不受配额限制（1000张/天）

## 4. OAuth 认证流程

```
用户点击登录
      ↓
重定向到 Linux DO 授权页面
      ↓
用户在 Linux DO 登录并授权
      ↓
Linux DO 重定向回 /api/auth/callback?code=xxx
      ↓
后端用 code 换取 access_token
      ↓
后端用 access_token 获取用户信息
      ↓
创建/更新用户，生成本系统 JWT
      ↓
重定向到前端 /auth/callback?token=xxx
      ↓
前端保存 token，完成登录
```

## 5. 获取的用户信息

从 Linux DO Connect 获取的用户信息包括：

| 字段 | 说明 | 用途 |
|------|------|------|
| `id` | 用户唯一标识 | 用户身份识别 |
| `username` | 论坛用户名 | 显示名称 |
| `name` | 用户昵称 | 显示名称 |
| `avatar_template` | 头像模板 URL | 用户头像 |
| `trust_level` | 信任等级 (0-4) | 配额分配 |
| `silenced` | 禁言状态 | 访问控制 |

## 6. 安全建议

1. **保护 Client Secret**: 
   - 不要在前端代码中暴露
   - 不要提交到版本控制系统
   - 使用环境变量管理

2. **使用 HTTPS**:
   - 生产环境必须使用 HTTPS
   - 确保回调地址使用 HTTPS

3. **验证用户状态**:
   - 检查 `silenced` 状态，禁止被禁言用户使用服务
   - 可根据 `trust_level` 实施更多限制

4. **定期轮换密钥**:
   - 定期更换 `SECRET_KEY`
   - 如果 Client Secret 泄露，立即在 Linux DO Connect 重新生成

## 7. 测试

### 开发环境测试

开发环境启用了模拟登录功能，可以通过以下 API 快速登录：

```bash
# 模拟 trust_level=2 的用户登录
curl -X POST "http://localhost:8000/api/auth/dev-login?username=test&trust_level=2"
```

### 生产环境测试

1. 确保所有环境变量配置正确
2. 访问登录页面，点击"使用 linux.do 登录"
3. 完成 Linux DO 授权流程
4. 检查用户信息和配额是否正确

## 8. 常见问题

### Q: 回调时报错"获取令牌失败"
A: 检查 Client ID 和 Client Secret 是否正确，回调地址是否与申请时填写的一致。

### Q: 用户登录后配额不对
A: 检查用户的 trust_level 是否正确获取，可以在后端日志中查看。

### Q: 头像不显示
A: 检查 avatar_template 的处理逻辑，确保正确替换 `{size}` 占位符。

## 9. 相关文件

- 后端认证: `server/app/api/auth.py`
- 配置文件: `server/app/config.py`
- 用户模型: `server/app/models/user.py`
- 前端登录: `web/src/app/login/page.tsx`
- 前端回调: `web/src/app/auth/callback/page.tsx`


