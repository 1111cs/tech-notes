import { defineConfig } from 'vitepress'

export default defineConfig({
  title: '技术札记',
  description: 'Java、MySQL、Redis 技术学习笔记',
  lang: 'zh-CN',

  // GitHub Pages 项目仓库名称
  base: '/tech-notes/',

  themeConfig: {
    nav: [
      { text: '首页', link: '/' },
      { text: 'Java', link: '/java/' },
      { text: 'MySQL', link: '/mysql/' },
      { text: 'Redis', link: '/redis/' }
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
      ]
    },
    
    search: {
      provider: 'local'
    },
    
    outline: {
      level: [2, 3],
      label: '本页目录'
    }
  }
})