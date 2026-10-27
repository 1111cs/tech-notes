import { defineConfig } from 'vitepress'

export default defineConfig({
  title: '技术札记',
  description: 'Java、MySQL、Redis 与实用工具的学习笔记',
  lang: 'zh-CN',

  // GitHub Pages 项目仓库名称
  base: '/tech-notes/',

  themeConfig: {
    nav: [
      { text: '首页', link: '/' },
      { text: 'Java', link: '/java/' },
      { text: 'MySQL', link: '/mysql/' },
      { text: 'Redis', link: '/redis/' },
      { text: 'LeetCode 上机题', link: '/leetcode上机题吧/' },
      { text: '工具使用', link: '/tools/' }
    ],

    sidebar: {
      '/java/': [
        {
          text: 'Java',
          items: [
            { text: '概览', link: '/java/' },
            { text: 'Java 数据类型', link: '/java/JAVA数据类型' },
            { text: 'Java 异常体系', link: '/java/java异常体系' },
            { text: 'Web 系统全链路', link: '/java/web系统全链路' }
          ]
        }
      ],
      '/mysql/': [
        {
          text: 'MySQL',
          items: [
            { text: '概览', link: '/mysql/' }
          ]
        }
      ],
      '/redis/': [
        {
          text: 'Redis',
          items: [
            { text: '概览', link: '/redis/' }
          ]
        }
      ],
      '/leetcode上机题吧/': [
        {
          text: 'LeetCode 上机题',
          items: [
            { text: '概览', link: '/leetcode上机题吧/' },
            { text: '题解模板', link: '/leetcode上机题吧/题解模板' }
          ]
        }
      ],
      '/tools/': [
        {
          text: '工具使用',
          items: [
            { text: '概览', link: '/tools/' },
            { text: 'Harness 与 Learn Claude Code', link: '/tools/harness和learn-claude-code项目' },
            { text: 'Postman 的使用', link: '/tools/Postman的使用' },
            { text: 'WPS 与 Windows 换行', link: '/tools/wps隐藏标记和win命令行换行' }
          ]
        }
      ]
    },
    
    search: {
      provider: 'local'
    },
    
    outline: {
      level: [2, 3],
      label: '本页目录'
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/1111cs/tech-notes' }
    ],

    footer: {
      message: '持续记录，让知识更易查找',
      copyright: 'Copyright © 2026 技术札记'
    }
  }
})
