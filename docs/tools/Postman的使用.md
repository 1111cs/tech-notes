# Postman的使用

## raw的介绍

postman的请求设置里，body中有个raw选项；

- **其他选项（如 `x-www-form-urlencoded`）**：Postman 会帮你把数据自动包装成类似 `username=admin&pwd=123` 这种浏览器表单的标准格式。
- **raw 选项**：表示你不想让 Postman 帮忙转换，而是要**把一段“原汁原味”的原始字符串直接发送给服务器**。

 选中 `raw` 后，旁边会弹出一个下拉菜单。你需要点击那个下拉菜单，选择具体的数据类型，最常用的就是 **JSON**。 

![](C:\Users\陈晓东\Desktop\博客待发\github展示\tech-notes\docs\imags\postman-raw选项.png)

如果你选择 `raw` -> `JSON`，Postman 就会自动帮你添加请求头 `Content-Type: application/json`，然后你就可以在下面的编辑框里，直接粘贴最纯粹的 JSON 文本：

```json
{"username": "admin", "pwd": "123"}
```

**总结：其实选择raw->json后，postman帮我们做的只有： 自动帮我们加上 Content-Type: application/json 这个请求头** 

## postman中的常规操作

1. **URL 栏**：填入 `https://www.example.com/api/login`（Host 自动出来）
2. **Method**：选择 `POST`
3. **Body 标签页**：选择 `raw` → `JSON`，然后粘贴 `{"username": "admin", "pwd": "123"}`（Content-Type 和 Content-Length 自动加上）
4. **Headers 标签页**：一般留空即可。除非你要传自定义头（比如 `Authorization: Bearer xxx`），才需要手动加

## 几个选项：

- **`Params`**：最终会组合进 **请求行（URL）** 中。
- **`Authorization`**：本质上属于 **请求头（Headers）**。
- **`Headers (6)`**：属于 **请求头（Headers）**。

**关于 Params 和 URL 的关系：两者完全可以二选一**

 **`Params` 选项卡里填写的键值对，本质上就是可以直接写在 URL 里的查询参数（Query String）**。 

**方式一：在 `Params` 选项卡中填写**
在 Key 和 Value 栏里分别填入 `page` 和 `1`，`limit` 和 `10`。

**方式二：直接写在 URL 中**
在地址栏里直接手动输入：
`https://www.example.com/api/getdata?page=1&limit=10`

**无论你用哪种方式，Postman 在最终发送请求时，拼出来的 HTTP 请求行是完全一模一样的。**

怎么选择呢：

- 使用 `Params` 选项卡（推荐）
  - **参数很多、很长的时候，写在 URL 里非常乱，容易把 `?`、`&` 符号打错。**
  - **在选项卡里像 Excel 一样一行一行地写，清晰、方便修改，还不容易出错。**
  - **支持一键隐藏（Disable）某些参数，调试时非常方便。**
- 直接写在 URL 中
  - 参数很少（比如就一两个），直接拼在链接里更直观。
  - 当你复制一段完整的 API 链接时，直接粘贴进去最快。

## postman中的变量

### **Postman 常见变量类型**

 **多个请求共享同一组服务器地址和认证信息，优先用「环境变量」；** 

|         变量类型         |      作用域       |                 适合放什么                 |
| :----------------------: | :---------------: | :----------------------------------------: |
|   **全局变量 Global**    |   整个工作空间    |         临时调试值；团队场景下慎用         |
| **集合变量 Collection**  |    当前集合内     |   集合内通用配置，如 API 版本、默认路径    |
| **环境变量 Environment** |     当前环境      | `base_url`、token、tenantId 等环境相关配置 |
|    **数据变量 Data**     |   一次集合运行    |        CSV/JSON 导入的批量测试数据         |
|    **局部变量 Local**    | 当前请求/本次运行 |       脚本里临时算出来的值，不持久化       |

### 使用方式

### **1. 新建环境**

打开 Postman 桌面客户端后：

1. 点击左侧栏的 **Environments**；
2. 点击 **Add** / **+** 新建一个环境；
3. 输入环境名称，比如 `dev`、`test`、`prod`；
4. 点击 **Save**。

也可以点右上角的 **环境选择器 / 齿轮图标**，选择 **Manage Environments**，再点 **Add** 创建。

### **2. 添加变量**

进入刚才创建的环境后，添加变量：

|     字段      |        填什么        |             示例              |
| :-----------: | :------------------: | :---------------------------: |
|   Variable    |        变量名        |          `base_url`           |
| Initial value | 初始值，适合团队共享 |   `https://api.example.com`   |
| Current value |   当前值，本地生效   | `https://api.dev.example.com` |

```text
Variable: base_url
Initial value: https://api.example.com
```

如果变量是敏感信息，比如 `token`、`api_key`，可以把它标记为 **sensitive**。

### **3. 选中环境**

回到 Postman 右上角的 **环境选择器**，把当前环境切换成你刚建好的环境，例如 `dev`。

这一步很重要：**不选中环境，环境变量不会生效。**

### **4. 在请求中引用**

在 URL、Headers、Body、Params 里都可以用双花括号引用：

```text
{{base_url}}/api/login
```

```
Authorization: Bearer {{token}}
```

Postman 发送请求时，会自动把 `{{base_url}}` 替换成当前环境里对应的值。

### **5. 用脚本动态设置**

如果你想在登录接口返回后自动保存 token，可以在 **Tests** 脚本里写：

```javascript
const res = pm.response.json();
pm.environment.set("token", res.data.token);
```

这样后续请求只要写：

```text
Authorization: Bearer {{token}}
```

就能自动带上最新 token。