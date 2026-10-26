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
      { text: '工具使用', link: '/tools/' }
    ],

    sidebar: {
      '/java/': [
        {
          text: 'Java',
          items: [
            { text: '概览', link: '/java/' }
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
      '/tools/': [
        {
          text: '工具使用',
          items: [
            { text: '概览', link: '/tools/' }
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
