# 2026 in LLMs (so far)：AI Agent 正在如何改变软件开发？

**作者**：Simon Willison
**演讲**：WeAreDevelopers World Congress North America
**演讲时间**：2026 年 9 月 25 日
**笔记范围**：目前阅读至文章二月份的内容

## 一、文章核心：2026 年，AI 开始真正改变软件开发

这篇文章回顾了 2026 年以来 LLM 和 AI Agent 领域的重要变化。

作者认为，2025 年 11 月是一个重要的转折点。当时 Claude Opus 4.5 和 GPT-5.1 等模型发布，模型本身虽然只是渐进式改进，但与各自的 Coding Agent 结合之后，编程能力发生了明显变化。

以前，AI 编程工具经常犯错，需要开发者反复纠正；而现在，它们已经逐渐变得足以胜任日常开发任务。

作者用一句话描述了这个变化：

> But every now and then when a model improves, it crosses an invisible line where something that didn't really work starts working.

有时候，模型能力的提升会跨越一道看不见的临界线，让原本无法可靠工作的东西突然变得可用了。

### 1. Coding Agent 与 Agent Harness

这里需要理解一个重要概念：**Agent Harness**。

它不是单纯的大语言模型，而是围绕模型构建的执行框架和运行环境。

可以简单理解为：

- LLM：负责理解需求、推理和决策。
- Agent Harness：提供工具调用、文件操作、终端执行、上下文管理和权限控制。
- Coding Agent：结合模型与执行框架，完成实际的软件开发任务。

例如，让 Coding Agent 修复 Mapping 模块的 SQL 问题：

1. 读取 Java 项目。
2. 搜索 Mapper 和 Service。
3. 分析 SQL。
4. 修改代码。
5. 执行测试。
6. 根据报错继续修复。
7. 汇报结果。

**核心认识：模型提供智能，Harness 提供执行环境，两者共同决定 Agent 的实际能力。**

## 二、作者的新年目标：从减少项目到主动增加项目

作者提到，过去每年都会给自己定一个新年目标：

> Take on less new projects, focus on the most important things in my existing projects.

少接一些新项目，把精力集中在现有项目中最重要的事情上。

但到了 2026 年，他决定反过来：

> We've got coding agents now, let's see what they can do.

现在我们有 Coding Agent 了，那就看看它们到底能做到什么程度。

于是他给自己定下了新的目标：

> Be more ambitious. Take on as many new projects as I want.

变得更有野心，想接多少新项目就接多少。

这里体现了作者对 AI 编程能力的信心：既然 AI 能够承担越来越多的开发工作，那么开发者也可以尝试更多以前没有精力完成的项目。

不过作者也开玩笑说，年底再问他这个决定是否正确，因为他现在已经同时处理很多项目了。

## 三、作者对 2026 年 AI 的几个预测

作者曾经参加 Oxide and Friends 播客，与 Bryan Cantrill 和 Adam Leventhal 分享自己对未来的预测。

### 1. LLM 最终能够写出高质量代码

作者曾预测：

> It will become undeniable that LLMs write good code.

LLM 能够编写高质量代码这一点，最终会变得不可否认。

作者认为，现在我们已经基本到达了这个阶段。

### 2. Sandboxing：沙箱隔离将成为重要问题

Sandbox 是一种受限制的程序运行环境。

对于 Coding Agent 来说，这尤其重要。

因为 Agent 可能拥有：

- 文件系统访问权限。
- 终端执行权限。
- 网络访问权限。
- Git 操作权限。
- 数据库或云资源访问权限。

如果 Agent 被恶意内容诱导，或者执行了错误操作，就可能造成实际损失。

因此需要通过 Sandbox 限制 Agent 能够访问和操作的资源。

作者统计，在当时大会的 277 场会议中，大约有 40 场涉及 Sandboxing 或 Agent Security。

这说明 Agent 安全已经成为一个受到广泛关注的技术问题。

### 3. Challenger Disaster：Coding Agent 可能发生重大安全事故

作者曾经预测：

> A Challenger disaster for coding agent security.

这里的 Challenger 指 1986 年美国挑战者号航天飞机灾难。

作者借此比喻可能发生的重大安全事故。

他具体担心的是：

> Coding agents being hijacked and causing real-world economic damage.

Coding Agent 被劫持，进而造成现实世界中的经济损失。

不过，作者也承认，截至文章写作时，他预测的那种灾难性事件还没有真正发生。

### 4. 其他预测

作者还开玩笑地预测，教皇可能会就 LLM 的经济影响发表意见。

此外，他预测新西兰珍稀动物 Kākāpō（鸮鹦鹉）会迎来一个优秀的繁殖季。

## 四、Deep Blue：AI 可能让程序员失去动力

在 Oxide and Friends 播客中，作者和 Adam 创造了一个新术语：

**Deep Blue**

它描述的是一种 AI 引发的倦怠感：

> AI induced ennui where software engineers get listless because the AI can do anything.

当 AI 好像什么都能做时，软件工程师反而可能变得无精打采、失去动力。

Deep Blue 是 IBM 开发的国际象棋超级计算机，1997 年击败了当时的世界冠军 Garry Kasparov。

作者借用这个名字，表达 AI 在某些智力和工作领域逐渐超越人类后，可能给人类带来的心理冲击。

例如：

- 以前需要自己花费大量时间完成的编码工作，现在 AI 很快就能完成。
- 以前引以为傲的编程技能，似乎不再那么稀缺。
- 当 AI 可以完成越来越多任务时，开发者可能开始怀疑自己的职业价值。

作者表示：

> As a software engineer, I've never had a year of my career where everything has changed so quickly and so dramatically.

作为一名软件工程师，我职业生涯中从来没有哪一年像今年这样，变化如此迅速、如此剧烈。

## 五、AI Mania：作者自己也陷入了 AI 狂热

作者提到，自己在一月份经历了一种他称为 AI Mania 的状态。

这不是医学意义上的诊断，而是作者对自己过度投入 AI 编程的一种幽默描述。

原文：

> Any time your agent isn't building something for you feels like wasted time.

只要你的 Agent 没有在替你构建什么东西，你就会觉得时间被浪费了。

甚至：

> You're losing sleep because you could be staying up later getting your agents to do stuff.

你会因为觉得自己还能继续让 Agent 干活，而不断熬夜。

### 1. 作者做了哪些项目？

他因为过度兴奋，开始尝试一些野心过大的项目：

**项目一：使用 Python 编写 JavaScript 解释器**

作者参考 Fabrice Bellard 的 MicroQuickJS，通过 AI 辅助编程的方式，用 Python 实现了一个 JavaScript Interpreter。

**项目二：使用 Python 构建 WebAssembly Runtime**

接着，他又使用 Python 构建了一个 WebAssembly 运行时。

### 2. 为什么这些项目反而治好了他的 AI 狂热？

原文：

> These projects were quite useful, in that they sort of cured me of my AI mania.

这些项目其实很有用，因为它们在某种程度上治好了我的 AI 狂热。

完成之后，他开始重新审视自己的成果：

> Does the world need a slow, buggy, half-baked Python JavaScript interpreter?

这个世界真的需要一个运行缓慢、充满 Bug、尚未成熟的 Python JavaScript 解释器吗？

他的回答是：

> I don't think the world does.

我认为这个世界并不需要。

这里有一个很重要的工程思想：

**Just because you can build it doesn't mean you should build it.**

仅仅因为你有能力把某个东西做出来，并不意味着你就应该去做。

AI 降低了软件开发的实现门槛，但需求判断和工程价值依然重要。

### 3. Pyodide 的技术架构

作者还展示了自己制作的一个在线 JavaScript Playground。

整个运行结构比较有意思：

1. 浏览器运行 JavaScript。
2. Pyodide 让 Python 能够在浏览器中运行。
3. 作者用 Python 编写的 JavaScript 解释器运行在 Pyodide 环境中。
4. 用户最终可以在网页中执行 JavaScript 代码。

这里需要区分：

- Interpreter：解释器。
- Compiler：编译器。
- Runtime：运行时环境。
- WebAssembly：一种面向 Web 的低级二进制指令格式。

Pyodide 本身是将 CPython 编译为 WebAssembly 的 Python 发行环境，并不是 JavaScript 解释器。

作者把这种层层嵌套的架构称为：

> A beautiful stack of horrors.

一个美丽而又令人头疼的技术嵌套结构。

## 六、OpenClaw：个人 AI Agent 开始爆发

到了 2026 年 1 月，作者回顾了一个从 2025 年 11 月开始的开源项目。

这个项目经历了多次更名：

Warelay → CLAWDIS → CLAWDBOT → Moltbot → OpenClaw。

最终成为 OpenClaw。

### 1. OpenClaw 是什么？

OpenClaw 是一个开源个人 AI Agent 项目。

它的目标是让 AI 不只是回答问题，还可以通过各种工具和外部应用执行实际任务。

与传统 Chatbot 相比：

| 普通 Chatbot   | Personal Agent     |
| -------------- | ------------------ |
| 主要回答问题   | 可以执行任务       |
| 主要处理对话   | 可以调用工具       |
| 用户提问后回答 | 可以持续推进工作流 |
| 输出文字       | 可以操作外部系统   |

作者提到，OpenClaw 在项目启动不到两个月时，就已经积累了 8300 次 Git Commit，后来更是超过了 10 万次。

他形容：

> This is the most vibe-coded piece of software in existence.

这可能是目前最具 Vibe Coding 特征的软件之一。

### 2. 什么是 Vibe Coding？

通过自然语言向 AI 描述需求，让 AI 生成、修改和调试代码，开发者更多通过描述意图、观察结果和反馈来推进开发。

作者认为，OpenClaw 引发了一场新的 Agent 热潮，并定义了一种新的软件类别。

他喜欢把这类软件称为：

**Claw。**

例如：

- OpenClaw
- NanoClaw
- IronClaw
- PicoClaw

### 3. 为什么 Mac Mini 突然卖断货？

作者提到，美国湾区的 Apple Store 一度出现 Mac Mini 售罄的情况，因为很多人购买 Mac Mini 来运行 OpenClaw。

Mac Mini 具有体积小、功耗相对较低、可以长期运行等特点，适合作为个人 Agent 的运行设备。

Drew Breunig 还提出了一个有趣的比喻：

> Your OpenClaw is a digital pet, and you buy a Mac mini as an aquarium to keep your claw in.

你的 OpenClaw 就像一只数字宠物，而 Mac Mini 就像一个水族箱，用来养着你的 Claw。

## 七、Moltbook：AI Agent 的社交网络

2026 年 1 月，还出现了一个非常有意思的网站：

**Moltbook。**

它是一个面向 AI Agent 的社交网络。

它的基本设想是：

- 人类拥有自己的 AI Agent。
- 将 Agent 接入 Moltbook。
- 不同 Agent 可以发布帖子、评论和交流。

传统社交网络主要是人与人交流，而 Moltbook 尝试让 Agent 与 Agent 进行交流。

作者用一句带有讽刺意味的话形容这个想法：

> What could possibly go wrong if you did that?

这么做还能出什么问题呢？

### Moltbook 的发展

作者描述了它非常戏剧化的早期发展：

- 周四：网站上线。
- 周五：迅速爆火。
- 周一：受到《纽约时报》报道。
- 周二：大量低质量 AI 内容和垃圾信息涌入，用户热情迅速消退。
- 一个月后：被 Facebook 的母公司 Meta 收购。

这里暴露了一个问题：

**让 Agent 自由交流并不困难，但如何保证交流内容的质量、真实性和安全性，是另一个问题。**

## 八、StrongDM：Dark Factory 与软件开发模式的改变

这是目前阅读内容中，我认为最值得深入研究的技术主题。

2026 年 2 月，StrongDM 介绍了他们的 Software Factory。

### 1. 什么是 Dark Factory？

Dan Shapiro 将这种模式称为 Dark Factory（黑暗工厂）。

它借鉴了制造业的 Lights-out Manufacturing（熄灯制造）理念。

如果工厂自动化程度足够高，就不再需要工人一直待在生产现场，甚至可以关掉灯。

借用到软件开发领域：

如果 AI Agent 已经能够自主完成软件开发，人类是否也不需要时刻盯着代码？

### 2. StrongDM 提出的两条规则

**Rule 1：Code must not be written by humans.**

代码不能由人类编写。

任何代码都必须经过 Coding Agent。

这意味着人类负责需求、规格和约束，而具体代码生成交给 Agent。

**Rule 2：Code must not be reviewed by humans.**

代码不能由人类审查。

甚至不允许开发人员直接阅读代码。

这是一种非常激进的软件开发理念。

### 3. 那么，如何保证软件质量？

传统开发模式：

人类编写代码 → 人工 Code Review → 测试 → 上线。

Dark Factory 模式：

人类定义需求和约束 → Agent 编写代码 → 自动化测试与验证 → Agent 根据结果迭代 → 交付。

这里的关键变化是：

**从审查代码本身，转向验证软件的实际行为。**

作者特别关注 StrongDM，是因为这家公司本身从事安全领域业务，参与项目的人也拥有数十年的相关经验。

他们正在探索：

> What it means to build software, not read the code, but still be confident that the software is of high quality.

如何在不阅读代码的情况下构建软件，同时依然有信心保证软件质量？

这引出了几个值得研究的工程问题：

- 如何设计足够可靠的自动化测试？
- 如何进行安全扫描和权限验证？
- 如何保证 Agent 生成的代码符合业务约束？
- 如何在没有人工 Code Review 的情况下发现隐藏缺陷？
- 如何监控 Agent 的实际执行行为？

需要注意，自动化测试通过并不意味着软件一定安全。StrongDM 的理念是一种探索性的激进实践，并不代表整个行业已经普遍采用。

## 九、其他有趣的 AI 与自然界新闻

作者还穿插了一些与 AI 无关的内容。

### 1. Kākāpō：鸮鹦鹉迎来繁殖季

Kākāpō 是新西兰特有的一种珍稀鹦鹉。

它有几个特点：

- 不会飞。
- 夜行。
- 体型较大。
- 全球数量非常少。

作者此前预测，2026 年它们会迎来一个优秀的繁殖季。

2 月 14 日，四年来第一只鸮鹦鹉雏鸟成功孵化。

原文：

> Breeding season is off to a good start!

繁殖季有了一个良好的开端！

### 2. Gemini 3.1 Pro：图像生成能力的提升

Google 在 2 月发布 Gemini 3.1 Pro。

作者展示了一项有趣的图像生成测试：让模型生成各种动物使用交通工具的画面。

例如：

- 鹈鹕骑自行车。
- 青蛙骑高轮自行车。
- 长颈鹿驾驶小汽车。
- 鸵鸟穿着轮滑鞋。
- 乌龟做滑板 Kickflip 动作。
- 腊肠犬驾驶加长豪华轿车。

作者特别关注图像中的细节是否合理。

例如，鹈鹕骑自行车时：

- 自行车链条是否位于正确位置？
- 两只脚是否分别位于两侧？
- 车篮里是否有一条小鱼？

他原本准备在模型通过这个测试后，换一种动物和交通工具继续测试。

结果 Gemini 3.1 Pro 的表现相当不错，甚至让他的测试基准有些难以继续提高。

这里体现了图像生成模型在复杂场景理解和细节生成方面的进步。

# 十、整篇文章目前的技术脉络

截至目前阅读的内容，可以归纳为五个方向：

| 主题                | 代表项目或概念         | 核心变化                       |
| ------------------- | ---------------------- | ------------------------------ |
| Coding Agent        | Claude Code、Codex     | AI 开始可靠地承担日常编程任务  |
| Agent Security      | Sandboxing、Deep Blue  | Agent 执行能力提升带来安全挑战 |
| Personal Agent      | OpenClaw               | AI 从聊天走向个人任务执行      |
| Agent 社交          | Moltbook               | 探索 Agent 与 Agent 之间的交流 |
| AI Software Factory | StrongDM、Dark Factory | 探索高度自动化的软件生产流程   |

# 十一、重点英语表达积累

以下是阅读过程中值得长期积累的表达。

### 1. 日常表达与写作

| 表达                               | 中文               |
| ---------------------------------- | ------------------ |
| set myself a New Year's resolution | 给自己制定新年目标 |
| for as long as I can remember      | 从我记事以来       |
| take on a project                  | 接手一个项目       |
| go the other way                   | 采取相反的做法     |
| turn out to be                     | 最终证明是         |
| have a lot of plates spinning      | 同时处理很多事情   |
| come to terms with                 | 接受并适应         |
| with hindsight                     | 事后看来           |
| touch on                           | 涉及、谈及         |
| weigh in                           | 发表意见           |
| kick off                           | 开始、引发         |
| blow up                            | 迅速走红           |
| be off to a good start             | 有一个良好的开端   |

### 2. 技术英语

| 表达                 | 中文                       |
| -------------------- | -------------------------- |
| Agent Harness        | Agent 运行框架             |
| Coding Agent         | 编程智能体                 |
| Sandbox / Sandboxing | 沙箱 / 沙箱隔离            |
| Agent Security       | Agent 安全                 |
| Repository           | 代码仓库                   |
| Commit               | 代码提交                   |
| Vibe Coding          | AI 辅助的自然语言驱动编程  |
| Interpreter          | 解释器                     |
| Compiler             | 编译器                     |
| Runtime              | 运行时环境                 |
| WebAssembly          | WebAssembly 二进制指令格式 |
| Software Factory     | 软件工厂                   |
| Dark Factory         | 黑暗工厂                   |
| Code Review          | 代码审查                   |
| Benchmark            | 基准测试                   |
| Verification         | 验证                       |

### 3. 特别值得记忆的地道表达

| 表达                                         | 中文                         |
| -------------------------------------------- | ---------------------------- |
| cross an invisible line                      | 跨过一个无形的临界点         |
| what could possibly go wrong?                | 还能出什么问题呢？（反讽）   |
| ridiculously over-ambitious                  | 野心大得离谱                 |
| a beautiful stack of horrors                 | 一个复杂得荒诞的技术嵌套结构 |
| half-baked                                   | 不成熟的、不完善的           |
| a deluge of slop and spam                    | 大量低质量内容和垃圾信息     |
| just because you can doesn't mean you should | 能做到不代表值得做           |

# 十二、个人思考：AI 时代的软件工程师应该关注什么？

读完目前这些内容，我认为有三个值得长期关注的问题。

### 1. AI 正在降低软件开发的实现门槛

以前，一个开发者想实现一个复杂功能，需要自己掌握大量技术细节。

现在，Coding Agent 能够帮助完成代码生成、文件修改、测试和调试。

这意味着开发者可以尝试更多项目。

但作者的 AI Mania 经历也提醒我们：

**实现成本降低，不代表每个想法都值得实现。**

需求判断和工程价值依然重要。

### 2. 软件工程师的工作可能从 Coding 转向 Specification + Verification

如果 Agent 能够完成越来越多的编码工作，那么工程师可能需要更加关注：

- Specification：需求定义、系统规格和约束。
- Architecture：系统架构设计。
- Verification：软件验证。
- Security：安全与权限控制。
- Evaluation：效果评估。

未来的竞争力可能不只是写代码的速度，而是能否清楚地定义问题，并判断 AI 给出的结果是否真正可靠。

### 3. Agent 工程正在从单体助手走向复杂系统

从 OpenClaw 到 Moltbook，再到 StrongDM Software Factory，可以看到 Agent 应用正在探索不同方向：

- 个人 Agent：替用户执行任务。
- 多 Agent 交互：让不同 Agent 进行交流。
- Agent 工作流：让多个 Agent 协同完成复杂任务。
- 软件工厂：探索端到端的软件自动化生产。

这些方向都与 Java Agent、AgentScope、MCP 工具调用等工程实践存在联系。

## 本阶段最重要的一句话

> Just because you can build it doesn't mean you should build it.

**仅仅因为你有能力把某个东西做出来，并不意味着你就应该去做。**

AI 时代，技术实现能力正在变得越来越容易获得，但需求判断、工程质量、安全意识和价值取舍，仍然是软件工程师需要长期培养的能力。

**阅读进度：** 本次整理覆盖文章开头至二月份的内容，后续月份暂不纳入本篇。