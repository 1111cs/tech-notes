# Spring Boot 接口文档实践：Swagger、OpenAPI 与 Knife4j

## 一、为什么需要接口文档？

在实际 Java 后端开发中，Controller 提供了大量 HTTP 接口。如果没有统一的接口文档，前后端开发人员、测试人员以及其他服务的开发人员，就需要反复查看 Controller 源码，才能知道接口的请求地址、请求方式、参数格式和返回结构。

例如：

```java
@Operation(summary = "商家创建优惠券推送任务")
@NoDuplicateSubmit(message = "请勿短时间内重复提交优惠券推送任务")
@PostMapping("/api/merchant-admin/coupon-task/create")
public Result<Void> createCouponTask(
        @RequestBody CouponTaskCreateReqDTO requestParam) {

    couponTaskService.createCouponTask(requestParam);
    return Results.success();
}
```

如果没有接口文档，调用方需要自己确认：

- 请求方式是 POST 还是 GET？
- 请求地址是什么？
- 请求体需要传递哪些字段？
- 哪些参数是必填的？
- 返回结果是什么结构？
- 接口有哪些业务限制？

Swagger、OpenAPI 和 Knife4j 正是为了解决这类问题而存在的。

## 二、先理解三个核心概念

### 1. OpenAPI：接口描述规范

OpenAPI 是一种用于描述 HTTP API 的标准规范。

它规定了如何使用结构化数据描述一个接口，包括：

- 接口路径和请求方式；
- 请求参数及参数类型；
- 请求体结构；
- 响应数据结构；
- 接口说明及标签；
- 请求和响应的状态码。

例如，一个接口可以被描述为：

```
/api/merchant-admin/coupon-task/create:
  post:
    summary: 商家创建优惠券推送任务
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
    responses:
      '200':
        description: 请求成功
```

这是一种机器可读的接口描述方式。

需要注意：OpenAPI 本身不是一个接口开发框架，也不负责处理 HTTP 请求。它只是定义了一套描述 API 的规范。

可以把它理解为：**后端开发人员和接口调用方共同遵守的接口说明书格式。**

### 2. Swagger：围绕 API 规范的工具生态

Swagger 是一套与 API 设计、描述和调试相关的工具生态。

常见工具包括：

| 工具            | 作用                                |
| --------------- | ----------------------------------- |
| Swagger UI      | 将 OpenAPI 文档渲染为可交互的网页   |
| Swagger Editor  | 编写和编辑 API 规范                 |
| Swagger Codegen | 根据 API 描述生成客户端或服务端代码 |

这里还需要了解一个历史背景：

早期 Swagger 规范后来被捐赠并演进为 OpenAPI 规范。Swagger 这个名称则继续用于相关工具生态。

所以现在我们经常看到：

- Swagger 2.0：旧版 API 描述规范；
- OpenAPI 3.x：新版 API 描述规范；
- Swagger UI：可以读取 OpenAPI 文档并展示接口的工具。

### 3. Knife4j：面向 Java 开发的接口文档增强工具

Knife4j 是 Java 生态中常见的接口文档工具，提供接口文档展示、调试、搜索、分组等增强能力。

在 Spring Boot 项目中，Knife4j 通常与 Springdoc-OpenAPI 配合使用。

其中：

- Springdoc-OpenAPI：负责扫描 Spring Boot 应用中的接口信息，生成 OpenAPI 文档。
- Knife4j：提供增强的接口文档展示和调试体验。

因此，Knife4j 并不是另一套与 OpenAPI 无关的接口描述规范，而是建立在 OpenAPI 体系之上的工具。

## 三、这几个工具之间是什么关系？

先看整体架构：

```
            Spring Boot 项目
                   |
                   v
             Controller
                   |
          Spring MVC 接口映射
                   |
                   v
          Springdoc-OpenAPI
                   |
       扫描 Controller、DTO、
       Spring 注解和 OpenAPI 注解
                   |
                   v
             OpenAPI JSON
              /         \
             /           \
            v             v
       Swagger UI       Knife4j
            |             |
            v             v
       接口文档展示     增强文档展示
       和接口调试       和接口调试
```

这里最重要的是：

**后端接口只需要按照正常的 Spring MVC 方式开发，文档框架就可以根据接口映射和注解信息自动生成 OpenAPI 描述。**

我们不需要为每个 Controller 手工编写一份独立的接口文档。

## 四、Spring Boot 是如何自动生成接口文档的？

这是最值得理解的部分。

### 1. 引入相关依赖

**在 Maven 项目中引入 Knife4j 对应的 Starter。**

例如，Spring Boot 3 的 OpenAPI 3 集成可以使用：

```
<dependency>
    <groupId>com.github.xiaoymin</groupId>
    <artifactId>knife4j-openapi3-jakarta-spring-boot-starter</artifactId>
    <version>对应兼容版本</version>
</dependency>
```

这个 Starter 会引入相应的 OpenAPI 文档生成和展示组件。

项目启动时，Spring Boot 会根据依赖中的自动配置机制注册相关组件。

因此，我们不需要自己编写一个 Controller 来实现 `/v3/api-docs`。

注意：实际使用时必须根据 Spring Boot、JDK 和 Knife4j 版本选择兼容的依赖。Spring Boot 2 的项目也有对应集成方式。

### 2. Springdoc 扫描 Controller

假设我们有下面的接口：

```
@RestController
@RequestMapping("/api/coupon")
@Tag(name = "优惠券管理")
public class CouponController {

    @Operation(summary = "根据 ID 查询优惠券")
    @GetMapping("/{id}")
    public Result<CouponDTO> findCoupon(
            @PathVariable Long id) {

        return Results.success(
                couponService.findById(id)
        );
    }
}
```

Springdoc 会结合 Spring MVC 的接口映射信息和 OpenAPI 注解，分析这个 Controller。

它能够识别：

| 代码              | 文档中的含义  |
| ----------------- | ------------- |
| `@RestController` | REST 控制器   |
| `@RequestMapping` | 接口公共路径  |
| `@GetMapping`     | HTTP GET 请求 |
| `@PathVariable`   | URL 路径参数  |
| `@Tag`            | 接口分组      |
| `@Operation`      | 接口说明      |
| `Result`          | 响应数据结构  |

最终形成对应的 OpenAPI 描述。

这里需要注意：Spring MVC 注解决定实际接口的路由和参数绑定，而 OpenAPI 注解主要用于补充接口文档的描述信息。

### 3. DTO 也会参与文档生成

例如：

```
@Data
public class CouponCreateReqDTO {

    @Schema(description = "优惠券名称", requiredMode = Schema.RequiredMode.REQUIRED)
    private String name;

    @Schema(description = "优惠券库存")
    private Integer stock;

    @Schema(description = "优惠券类型")
    private Integer type;
}
```

Springdoc 可以结合 DTO 的字段、类型、校验约束以及 `@Schema` 等注解生成请求参数模型。

因此，文档不仅可以展示接口地址，还可以展示请求体中有哪些字段、字段类型是什么、字段有什么业务含义。

## 五、三个常见访问地址分别有什么作用？

以我们正在运行的 oneCoupon 项目为例：

### 1. Knife4j：/doc.html

访问：

```
http://127.0.0.1:10010/doc.html
```

这是我们日常使用最多的入口。

主要功能：

- 查看接口分组；
- 查看接口请求方式和请求地址；
- 查看请求参数；
- 查看 DTO 字段说明；
- 查看响应结构；
- 在线调试接口；
- 搜索接口。

它本质上是一个文档展示与调试页面。

### 2. Swagger UI：/swagger-ui.html

访问：

```
http://127.0.0.1:10010/swagger-ui.html
```

Swagger UI 同样能够读取 OpenAPI 文档并展示接口。

与 Knife4j 相比，它提供的是相对基础的接口文档展示和调试体验。

两者的定位比较接近，但前端实现和增强功能不同。

### 3. OpenAPI JSON：/v3/api-docs

访问：

```
http://127.0.0.1:10010/v3/api-docs
```

这个入口非常重要。

它返回的是机器可读的 OpenAPI JSON 数据，而不是给人直接阅读的图形化文档。

例如：

```
{
  "openapi": "3.0.1",
  "paths": {
    "/api/coupon/{id}": {
      "get": {
        "summary": "根据 ID 查询优惠券"
      }
    }
  }
}
```

实际返回内容会包含更完整的接口参数、请求体、响应结构和组件定义。

它有什么价值？

**第一，作为接口文档的数据源。**

Knife4j 和 Swagger UI 可以读取它，再将其渲染为可视化页面。

**第二，供第三方工具导入。**

例如，Apifox、Postman 等工具可以导入 OpenAPI JSON，从而自动生成接口集合，减少手工维护接口信息的工作量。

**第三，支持自动化开发。**

可以基于 OpenAPI 描述生成客户端 SDK、接口调用代码，或者用于接口契约检查。

所以，`/v3/api-docs` 是整套体系中非常重要的一个组成部分。

## 六、常用注解及其作用

在实际开发中，我们不需要记住所有注解，掌握以下几个就足够应付大部分业务场景。

### 1. @Tag：接口分组

```
@Tag(name = "优惠券模板管理")
@RestController
public class CouponTemplateController {
}
```

用于给 Controller 下的接口设置分组。

### 2. @Operation：接口说明

```
@Operation(summary = "商家创建优惠券模板")
@PostMapping("/create")
public Result<String> create() {
    return Results.success();
}
```

用于描述接口的主要用途。

我们之前看到的：

```
@Operation(summary = "商家创建优惠券推送任务")
```

就是告诉接口文档，这个接口的业务含义是什么。

### 3. @Parameter：参数说明

```
@Operation(summary = "查询优惠券")
@GetMapping("/find")
public Result<CouponDTO> find(
        @Parameter(description = "优惠券模板 ID")
        @RequestParam Long couponTemplateId) {

    return Results.success();
}
```

用于补充参数的说明、是否必填等信息。

### 4. @Schema：DTO 字段说明

```
@Data
public class CouponCreateReqDTO {

    @Schema(description = "优惠券名称")
    private String name;

    @Schema(description = "优惠券库存")
    private Integer stock;
}
```

用于描述请求对象、响应对象及其字段。

### 5. @ApiResponse：响应说明

```
@Operation(summary = "查询优惠券")
@ApiResponse(
    responseCode = "200",
    description = "查询成功"
)
@GetMapping("/find")
public Result<CouponDTO> find() {
    return Results.success();
}
```

用于补充不同 HTTP 状态码对应的响应说明。

## 七、结合 oneCoupon 项目实际操作

我们之前一直在学习商家创建优惠券模板、查询优惠券模板以及创建优惠券推送任务。

现在可以通过 Knife4j 把这些知识串起来。

例如：

```
@Operation(summary = "商家创建优惠券推送任务")
@NoDuplicateSubmit(
    message = "请勿短时间内重复提交优惠券推送任务"
)
@PostMapping("/api/merchant-admin/coupon-task/create")
public Result<Void> createCouponTask(
        @RequestBody CouponTaskCreateReqDTO requestParam) {

    couponTaskService.createCouponTask(requestParam);
    return Results.success();
}
```

这里几个注解的职责并不相同：

| 注解                 | 所属功能       | 作用                         |
| -------------------- | -------------- | ---------------------------- |
| `@Operation`         | OpenAPI        | 描述接口用途                 |
| `@NoDuplicateSubmit` | 项目自定义 AOP | 防止短时间内重复提交         |
| `@PostMapping`       | Spring MVC     | 注册 POST 接口映射           |
| `@RequestBody`       | Spring MVC     | 将请求体反序列化为 Java 对象 |

这几个注解放在一起，并不意味着它们都属于 Swagger。

尤其是 `@NoDuplicateSubmit`，它是项目自己的业务增强逻辑，不负责生成接口文档。

### 实际测试流程

1. 启动 merchant-admin 服务。
2. 访问 `/v3/api-docs`，检查 OpenAPI JSON 是否正常生成。
3. 访问 `/doc.html`，查看优惠券模板管理和推送任务管理接口。
4. 选择一个 GET 接口，填写查询参数，点击调试。
5. 选择一个 POST 接口，填写 JSON 请求体，发送请求。
6. 查看 HTTP 响应、业务状态码和返回数据。

我们项目的本地测试环境已经通过 `UserConfiguration` 注入了模拟用户，因此当前测试不需要手动添加登录 Token。具体以当前本地环境配置为准。

## 八、需要注意的几个问题

**1. 接口文档不等于接口实现。**

`@Operation` 只负责补充接口描述，不会改变业务逻辑。

真正决定接口如何执行的仍然是 Spring MVC 映射和 Controller 中的代码。

**2. 接口文档不一定完全准确。**

如果 DTO 字段说明、必填约束或响应注解没有正确维护，生成的文档也可能与真实业务行为不一致。

因此需要开发人员维护注解，并通过实际接口测试验证。

**3. 不能把文档调试页面直接暴露在生产环境。**

接口文档可能暴露系统接口路径、参数结构和业务信息。生产环境应根据实际需要关闭文档或者实施访问控制。

## 九、总结

通过这次学习，我们需要建立以下认识：

- OpenAPI：描述 HTTP API 的规范。
- Swagger：围绕 API 描述规范的一套工具生态。
- Swagger UI：展示和调试 OpenAPI 文档。
- Springdoc-OpenAPI：扫描 Spring Boot 应用并生成 OpenAPI 描述。
- Knife4j：增强接口文档展示和调试体验。

它们共同解决的是一个问题：**如何让后端开发的接口能够被其他开发人员、测试人员以及第三方工具准确理解和使用。**

在日常 Java 后端开发中，我们需要熟悉 Spring MVC 注解、OpenAPI 常用注解，以及如何使用 Knife4j 调试接口。这样在接手一个陌生项目时，就可以先通过接口文档了解系统提供了哪些业务能力，再沿着 Controller、Service、Mapper 的调用链深入阅读源码。