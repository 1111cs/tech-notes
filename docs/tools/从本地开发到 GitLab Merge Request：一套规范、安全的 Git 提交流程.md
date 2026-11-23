# 从本地开发到 GitLab Merge Request：一套规范、安全的 Git 提交流程

在多人协作的企业项目中，完成代码开发只是第一步。如何将本地修改安全、准确地提交到远程 GitLab，同样是软件工程实践中的重要环节。

尤其是在前后端分离、涉及数据库迁移脚本和多个业务模块的项目中，一次不规范的 Git 操作可能造成：

- 直接向 `main` 推送代码，影响其他开发人员。
- 将测试脚本、临时文档、个人草稿等无关文件提交到仓库。
- 遗漏数据库 SQL 迁移脚本，导致代码部署后数据库结构不匹配。
- 未经过编译验证就提交，给后续集成带来问题。
- 提交后才发现文件遗漏、分支错误或者代码冲突。

因此，我们需要建立一套从本地检查到远程 MR 的标准化提交流程。

## 一、分支管理：为什么不能直接向 main 提交？

在多人协作开发中，`main` 通常代表团队共同维护的主干代码。

如果所有开发人员都直接在 `main` 上修改和推送代码，就容易出现提交相互覆盖、代码冲突难以追踪等问题。

更合理的方式是采用 **Feature Branch（特性分支）工作流**。

基本流程：

1. 从远端最新的 `origin/main` 创建个人开发分支。
2. 在个人分支上完成业务开发。
3. 将代码提交并推送到 GitLab。
4. 创建 Merge Request（MR）。
5. 经代码评审后，将个人分支合并到 `main`。

例如：

```
# 获取远端最新信息
git fetch origin

# 基于远端 main 创建个人分支
git checkout -b feature/joys-hotel-management origin/main

# 开发完成后提交
git commit -m "feat: 完成酒店管理模块优化"

# 推送个人分支
git push -u origin feature/joys-hotel-management

这里origin是远程仓库的别名，然后feature/joys-hotel-management是远程仓库的一个分支名
我们这里就是要把本地仓库的修改同步推送到远程的feature/joys-hotel-management分支上
git push <远程仓库名> <分支名> —— 前半段回答"推到哪儿"，后半段回答"推成哪个分支"，-u 让 Git 记住这对组合，之后直接 git push / git pull 即可。
```

这里有几个重要概念：

- `origin`：远程仓库的默认别名。
- `main`：团队主干分支。
- `origin/main`：本地记录的远端 main 分支状态。
- `feature/*`：用于独立开发某项功能的特性分支。
- `-u`：建立本地分支与远端分支的追踪关系，后续可以直接使用 `git push` 和 `git pull`。

需要注意：`git fetch` 只更新远端引用，不会自动修改当前分支。

**核心原则：个人开发，个人分支；代码集成，通过 MR。**

## 二、提交前检查：先搞清楚自己改了什么

很多 Git 问题并不是出在提交命令，而是开发人员没有弄清楚当前工作区的状态。

Git 中有几个需要理解的概念：

| 概念                          | 含义                                    |
| ----------------------------- | --------------------------------------- |
| 工作区（Working Directory）   | 当前实际修改的代码和文件                |
| 暂存区（Staging Area）        | 已经通过 `git add` 选中、准备提交的文件 |
| 本地仓库（Local Repository）  | 已经通过 `git commit` 保存的提交记录    |
| 远程仓库（Remote Repository） | GitLab 上的远程代码仓库                 |

可以把一次提交理解为：

**工作区修改 → 暂存区筛选 → 本地提交 → 远程推送。**

在正式提交前，先进行只读检查：

```
# 查看当前分支及其远端追踪关系
git branch -vv

# 查看远端仓库地址
git remote -v

# 查看远端 main 最新提交
git ls-remote origin refs/heads/main

# 查看所有修改和未跟踪文件
git status -uall --short

# 查看修改统计
git diff --stat
```

其中：

`git status -uall --short` 非常实用。

它不仅展示已经修改的文件，还会展开显示未跟踪目录中的文件，避免遗漏隐藏在目录中的测试脚本、临时文件等。

如果需要检查某个配置文件是否包含敏感信息，可以进一步查看：

```
git diff application.yml
```

另外，可以使用：

```
git ls-files | Select-String -Pattern 'src/test|__tests__|\.test\.|\.spec\.'
```

检查仓库中已经被 Git 跟踪的历史测试文件，了解当前仓库的测试文件基线，避免误删历史文件。

## 三、精准暂存：为什么不推荐 git add .？

这是整个提交流程中非常重要的一步。

很多开发人员习惯直接执行：

```
git add .
```

这个命令会将当前目录下符合 Git 跟踪规则的修改和新增文件加入暂存区。

问题在于：**开发过程中产生的所有文件，并不都是应该提交的文件。**

例如：

- `docs/qa/`：QA 测试数据和验证脚本。
- `docs/plans/`：开发过程中的设计草稿。
- `scripts/qa_*.py`：个人测试脚本。
- 根目录临时 Markdown 文档。
- `logs/`：运行日志。
- `target/`、`dist/`：构建产物。

这些文件可能对个人开发有价值，但不一定属于正式业务交付内容。

因此，可以采用白名单暂存策略：

```
git add -- `
  hollytravel-gds-api/src/main `
  hollytravel-gds-api/sql/hotel_management_migration.sql `
  hollytravel-gds-vue/src
```

只将明确需要提交的后端源码、数据库迁移脚本和前端源码加入暂存区。

这里体现的是一种工程习惯：

**不是把所有修改过的文件都提交，而是明确本次业务交付需要哪些文件。**

需要特别注意，目录白名单并不意味着目录中的每个文件都一定安全。配置文件、密钥、调试代码仍然需要单独检查。

## 四、暂存区二次核验：提交之前再检查一次

执行 `git add` 后，并不意味着可以直接提交。

还需要检查暂存区，确认本次提交到底包含哪些文件。

```
# 查看暂存区文件数量
git diff --cached --name-only | Measure-Object

# 查看暂存区文件清单
git diff --cached --name-only

# 查看暂存区修改统计
git diff --cached --stat
```

其中：

- `git diff`：查看工作区相对于暂存区的修改。
- `git diff --cached`：查看暂存区相对于最近一次提交的修改。

两者的区别非常重要。

如果希望扫描是否意外加入测试文件、QA 脚本或个人文档：

```
git diff --cached --name-only |
  Select-String -Pattern 'src/test|__tests__|\.test\.|\.spec\.|^docs/|scripts/|\.md$' -CaseSensitive:$false
```

预期没有输出。

如果发现某个文件不应该提交，可以执行：

```
git reset HEAD -- <文件路径>
```

它只会将文件从暂存区移出，不会删除本地文件。

这样既保留了个人开发现场，也避免了无关文件进入正式提交。

## 五、提交前质量验证：不要带病提交

代码提交之前，还需要进行必要的构建验证。

前后端项目可以分别进行检查。

**1. 后端 Maven 编译**

```
cd hollytravel-gds-api

mvn compile -q
```

`mvn compile` 会编译后端生产源码，检查 Java 代码中的语法错误、类型错误以及依赖相关的编译问题。

它不会执行单元测试，也不会进行完整的测试阶段。

**2. 前端生产构建**

```
cd hollytravel-gds-vue

npm run build
```

该命令会按照项目配置执行生产构建，检查前端代码是否存在构建错误。

需要注意，编译通过不代表业务逻辑完全正确。对于涉及数据库、接口联调和复杂业务流程的修改，还需要结合实际情况进行功能验证。

**核心原则：提交之前至少保证生产源码能够正常编译和构建。**

## 六、Commit 与 Push：形成清晰的提交记录

完成上述检查后，就可以正式提交代码。

```
# 提交本次修改
git commit -m "feat: 完成酒店管理模块优化"

# 推送个人分支到远端
git push -u origin feature/joys-hotel-management
```

Commit Message 建议采用统一的语义化格式：

```
<type>: <本次提交的主要内容>
```

常见类型：

| 类型     | 含义                 |
| -------- | -------------------- |
| feat     | 新增功能             |
| fix      | 修复问题             |
| refactor | 重构代码             |
| perf     | 性能优化             |
| docs     | 文档修改             |
| test     | 测试相关             |
| chore    | 构建、配置等维护工作 |

例如：

```
feat: 新增酒店异步导出功能
fix: 修复供应商酒店筛选问题
perf: 优化 Mapping 百万级数据查询
refactor: 重构酒店管理模块
```

推送成功后，可以通过：

```
git log -n 2 --oneline --decorate
```

查看最近提交记录及当前分支指向。

随后在 GitLab 创建 Merge Request，选择：

- Source Branch：个人 Feature 分支。
- Target Branch：`main`。

由团队进行代码评审，确认没有问题后合并。

至此，一次完整的代码提交流程才算完成。

## 七、常见 Git 问题与急救命令

实际开发中，即使有规范流程，也难免出现操作失误。下面几个命令值得掌握。

**1. git add 错误地加入了测试文件**

```
git reset HEAD -- <文件路径>
```

仅移出暂存区，保留本地文件。

**2. Commit 后发现漏加文件或提交说明写错**

在尚未 Push 的情况下：

```
git add <文件路径>
git commit --amend
```

可以将修改合并到上一次提交中。

**3. 想撤销最近一次本地 Commit，但保留代码修改**

```
git reset --soft HEAD~1
```

撤销最近一次提交，但保留原来的暂存状态。

**4. 希望从 Git 仓库移除历史跟踪的测试文件，但本地仍然保留**

```
git rm --cached <文件路径>
```

该操作会将文件从 Git 索引中移除，后续提交后远端也会删除对应文件，但本地磁盘上的文件仍然保留。

注意：如果文件仍被其他 Git 规则跟踪或重新添加，还需要相应处理。

**5. 推送后发现远端 main 更新，MR 出现冲突**

```
git fetch origin

git merge origin/main
```

在个人特性分支上合并最新主干代码，解决冲突后：

```
git add <已解决的文件>
git commit
git push
```

这样可以在不直接修改 `main` 的情况下解决集成冲突。

**6. Windows 提示 LF will be replaced by CRLF**

这通常与 Windows 的 Git 换行符配置有关。

`LF` 是 Unix/Linux 常见的换行符，`CRLF` 是 Windows 常见的换行符。

如果只是常规的行尾转换提示，通常不代表代码错误。不过团队仍应统一 `.gitattributes` 或 Git 换行符策略，避免不必要的整文件差异。

## 八、总结：Git 提交不仅是命令操作，更是工程质量控制

回顾整个过程，可以将标准 GitLab 提交流程概括为：

1. **分支隔离**：基于最新 `origin/main` 创建个人特性分支。
2. **工作区检查**：明确当前修改、未跟踪文件及配置变化。
3. **白名单暂存**：只提交本次业务交付需要的文件。
4. **暂存区核验**：再次确认文件清单，排除测试数据和个人草稿。
5. **构建验证**：执行后端编译和前端生产构建。
6. **Commit & Push**：形成清晰、可追踪的提交记录。
7. **Merge Request**：通过代码评审将个人开发成果合入团队主干。

我认为，真正值得养成的习惯是：

**提交之前先检查，暂存之后再核验，推送之前做验证，代码合入走 MR。**

Git 不只是一个保存代码的工具，它也是团队协作、变更追踪和软件质量控制的重要基础设施。

对于刚进入企业项目开发的工程师来说，掌握这些规范，比单纯记住几个 Git 命令更有价值。