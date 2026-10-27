# web系统全链路

 用户在浏览器输入 URL 并回车后：

- DNS 解析：浏览器首先将域名（如 http://www.example.com）解析为服务器的 IP 地址。
- **建立连接**：浏览器与服务器通过 TCP 三次握手建立连接（如果是 HTTPS 还会进行 SSL/TLS 握手）。
- **发送 HTTP 请求**：浏览器构建 HTTP 请求报文（包含请求行、请求头、请求体），发送给 Web 服务器。

- **Web 服务器处理**：服务器（如 Nginx、Tomcat）接收到请求。如果是静态资源（图片、CSS），直接返回；如果是动态请求，则转发给后端应用服务器。
- **DispatcherServlet 拦截**：在 Spring MVC 架构中，核心控制器 `DispatcherServlet` 会拦截该请求。

- Controller 层（控制层）：
  - `DispatcherServlet` 根据 URL 映射找到对应的 **Controller** 方法。
  - Controller 负责接收参数、校验数据，并调用 Service 层接口。它不处理复杂业务逻辑，只负责“调度”。

- Service 层处理核心业务逻辑。如果需要存取数据，它会调用 DAO 层。（调用 **DAO**（或 MyBatis/JPA 的 Mapper接口））

- DAO 层负责将 Java 对象的操作转换为 SQL 语句。

- **执行 SQL**：数据库（如 MySQL）接收到 SQL 语句并执行查询或更新操作。
- **返回结果**：数据库将结果集返回给 DAO 层，DAO 将其封装成 Java 对象（Entity/DTO）返回给 Service，Service 处理后再返回给 Controller。

- **视图渲染/数据封装**：Controller 拿到最终结果。如果是前后端分离项目，通常将结果封装为 JSON 格式；如果是传统项目，可能通过 ViewResolver 渲染 HTML 页面。
- **HTTP 响应**：结果通过 HTTP 响应报文返回给浏览器。

- **解析与渲染**：浏览器接收到响应数据（HTML/CSS/JS 或 JSON），解析 DOM 树，渲染页面展示给用户。

## DAO层和Mybatis Mapper有区别吗？

 **DAO (Data Access Object)**：这是一个**设计模式/概念**。它代表“数据访问对象”，定义了一套操作数据库的规范（比如 `getUserById`, `saveUser`）。 

**MyBatis Mapper**：这是 MyBatis 框架中的一种**具体实现方式**。在 MyBatis 中，你只需要定义一个接口（Mapper 接口），不需要写实现类。MyBatis 会在运行时通过动态代理自动生成这个接口的实现类，去执行 XML 或注解里的 SQL。

> 在现代 Spring Boot + MyBatis 项目中，我们通常把 Mapper 接口直接放在 `dao` 或 `mapper` 包下，这时候 **Mapper 就等同于 DAO 层的实现**。

## controller层的几个注解要记住

```java
@RestController
@RequestMapping("/api/user")
public class UserController {

    @Autowired
    private UserService userService;

    // 1. 获取用户：GET /api/user/1001
    @GetMapping("/{id}")
    public User getUser(@PathVariable("id") Long id) {
        return userService.findById(id);
    }

    // 2. 保存用户：POST /api/user (Body传JSON)
    @PostMapping
    public String saveUser(@RequestBody User user) {
        userService.save(user);
        return "success";
    }
    
    // 3. 搜索用户：GET /api/user/search?name=张三
    @GetMapping("/search")
    public List<User> search(@RequestParam String name) {
        return userService.findByName(name);
    }
}
```

| 注解                           | 作用                                                         | 示例                                       |
| ------------------------------ | ------------------------------------------------------------ | ------------------------------------------ |
| `@RestController`              | 标记这是一个控制器，且方法返回值直接写入响应体（相当于 `@Controller` + `@ResponseBody`）。 | 类级别使用                                 |
| `@RequestMapping`              | 映射请求路径。                                               | `@RequestMapping("/user")`                 |
| `@GetMapping` / `@PostMapping` | 专门处理 GET / POST 请求的简写。                             | `@GetMapping("/list")`                     |
| `@RequestParam`                | 接收 URL 问号后面的参数（如 `?id=1`）。                      | `public User get(@RequestParam Long id)`   |
| `@PathVariable`                | 接收 URL 路径中的参数（如 `/user/1`）。                      | `public User get(@PathVariable Long id)`   |
| `@RequestBody`                 | 接收前端传来的 JSON 数据，自动转为 Java 对象。               | `public void save(@RequestBody User user)` |

### 方法返回值

```
@RestController
这玩意定义在类中，那么我们就可以让方法返回值直接写入响应体；
我观察到方法返回是： return userService.findById(id); return "success";  return userService.findByName(name);
请问对格式有要求吗？是不是都是json？
```

==》

 **对返回值类型没有硬性格式要求，但 `@RestController` 默认会用 Jackson 把返回值序列化成 JSON 写入响应体；不过返回 `String` 时不会自动包成 JSON，而是原样输出。** 

 `@RestController` 本质是 `@Controller + @ResponseBody`。 方法返回后，Spring 会通过 `HttpMessageConverter` 做内容协商，默认走 `MappingJackson2HttpMessageConverter`（Jackson）。 

| 返回类型    | 实际输出                       | 说明                                                        |
| ----------- | ------------------------------ | ----------------------------------------------------------- |
| `User` 对象 | `{"id":1,"name":"张三"}`       | Jackson 按 getter 序列化成 JSON                             |
| `List`      | `[{"id":1,...}, {"id":2,...}]` | 集合也会被序列化成 JSON 数组                                |
| `"success"` | `success`                      | **原样字符串**，Content-Type 通常是 `text/plain`，不是 JSON |
| `Map`       | `{"code":200,"msg":"ok"}`      | 会被序列化成 JSON                                           |

##   Content-Type 与HTTP 响应报文

 Content-Type这个东西出现在了响应头和请求头中，是指要告诉通讯对方，我的body里面的内容是什么类型 。

一个完整的 HTTP 响应长这样：

```http
HTTP/1.1 200 OK
Content-Type: text/plain;charset=UTF-8    ← 响应头
Content-Length: 7

success                                    ← 响应体
```

`Content-Type` 的作用就是告诉接收方（浏览器、前端框架、Postman）：**"响应体里的这段内容是什么格式，你该怎么解析它。"**

常见的 Content-Type 还有：

 `text/plain` 就是 **"纯文本"**，表示内容没有任何结构化格式，就是一段普通的文字。 

|    Content-Type    |      含义       |      示例      |
| :----------------: | :-------------: | :------------: |
|    `text/plain`    |     纯文本      |   `success`    |
|    `text/html`     |    HTML 网页    |    `Hello`     |
| `application/json` | JSON 结构化数据 | `{"msg":"ok"}` |
|    `image/png`     |    PNG 图片     | 二进制图片数据 |

`text` 表示面向人类阅读的文本，`application` 表示面向程序处理的数据。

你返回 `"success"`，响应体里确实就是 `success` 这几个字符。浏览器收到后，看到 `Content-Type: text/plain`，就知道"哦，这是纯文本"，直接显示出来。

如果你返回的是 `{"msg":"ok"}` 这样的字符串，响应体里也确实就是这段 JSON 文本。但如果 `Content-Type` 还是 `text/plain`，浏览器会把它当成普通文本显示，**不会自动解析成对象**。前端如果用 `response.json()` 去解析，可能会报错。

## HTTP 请求报文

 当你在浏览器输入网址回车，或者点击按钮时，浏览器会发送一段文本给服务器，这就是请求报文。它由三部分组成：**请求行、请求头、请求体**。 

```java
POST /api/login HTTP/1.1          <-- 请求行：方法 + 路径 + 协议版本
Host: www.example.com             <-- 请求头：告诉服务器我要访问哪个域名
Content-Type: application/json    <-- 请求头：告诉服务器我发的是JSON数据
User-Agent: Mozilla/5.0 ...       <-- 请求头：我是Chrome浏览器
Content-Length: 42                <-- 请求头：下面正文的长度
Authorization: Bearer <token>     <-- 请求头（认证用）
Cookie: session_id=abc123...      <--请求头（状态保持）
    
    
{"username": "admin", "pwd": "123"} <-- 请求体：真正要传输的数据（GET请求通常没有这一行）
```

- **请求行** = 方法 + 路径 + 协议版本（就这一行）
- **请求头** = 零个或多个"键: 值"对，每行一个，包括 Host、Content-Type、Authorization、Cookie 等
- **空行** = 请求头和请求体之间的分隔（必须有一个空行）
- **请求体** = 只有 POST/PUT/PATCH 等方法才有，GET 请求没有 Body

### web服务器介绍（如 Nginx、Tomcat）

 Tomcat 是传统 Spring MVC Web 应用的 **HTTP 服务入口和 Servlet 运行容器**，而 Spring 才是组织业务组件、管理依赖和调用流程的核心框架。 一般后端系统都要有这样一个容器；

不过 Tomcat 可以替换为 Jetty、Undertow 等其他兼容的 Web 服务器；Spring WebFlux 还可以采用 Reactor Netty 等不同的运行模型。 

nginx的话其实可以省略。  比如你开发一个简单的 Spring Boot 后端项目，只使用内嵌 Tomcat 就能够对外提供 HTTP API，无须安装 Nginx。

至于他的作用，主要就是减少后端的负担 。例如：

- 静态资源直接由 Nginx 返回，减少 Tomcat 需要处理的请求。

  > Nginx 可以读取服务器上的 HTML、CSS、JavaScript、图片等静态文件，然后直接返回给浏览器，不必经过 Java 后端。但 Nginx 本身不是专门的文件存储系统。大型项目的图片、视频可能放在对象存储中，例如 OSS 或 S3，再由 CDN 分发。

- 开启压缩，可以减少响应传输的数据量。

- 使用缓存，可以减少重复访问后端的次数。

- **使用负载均衡，可以把请求分配给多个应用实例**


