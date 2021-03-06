import emojiRegex from 'emoji-regex'
import Token from 'markdown-it/lib/token'
import markdownItEmoji from 'markdown-it-emoji'
import twemoji from 'twemoji'
import twemojiCSS from './twemoji.scss'

export interface EmojiOptions {
  shortcode?: boolean | 'twemoji'
  twemojiBase?: string
  unicode?: boolean | 'twemoji'
}

const regexForSplit = new RegExp(`(${emojiRegex().source})`, 'g')

export const css = (opts: EmojiOptions) =>
  opts.shortcode === 'twemoji' || opts.unicode === 'twemoji'
    ? twemojiCSS
    : undefined

export function markdown(md, opts: EmojiOptions): void {
  const twemojiParse = (content: string): string =>
    twemoji
      .parse(content, {
        base: opts.twemojiBase,
        className: '__placeholder__',
        ext: '.svg',
        size: 'svg',
      })
      .replace('class="__placeholder__"', 'data-marp-twemoji')

  const twemojiRenderer = (token: any[], idx: number): string =>
    twemojiParse(token[idx].content)

  if (opts.shortcode) {
    md.use(markdownItEmoji, { shortcuts: {} })
    if (opts.shortcode === 'twemoji') md.renderer.rules.emoji = twemojiRenderer
  }

  if (opts.unicode) {
    md.core.ruler.after('inline', 'marp_unicode_emoji', ({ tokens }) => {
      for (const token of tokens) {
        if (token.type === 'inline') {
          const newChildren: any[] = []

          for (const t of token.children) {
            if (t.type === 'text') {
              const splittedByEmoji = t.content.split(regexForSplit)

              newChildren.push(
                ...splittedByEmoji.reduce(
                  (splitedArr, text, idx) =>
                    text.length === 0
                      ? splitedArr
                      : [
                          ...splitedArr,
                          Object.assign(new Token(), {
                            ...t,
                            content: text,
                            type: idx % 2 ? 'unicode_emoji' : 'text',
                          }),
                        ],
                  []
                )
              )
            } else {
              newChildren.push(t)
            }
          }

          token.children = newChildren
        }
      }
    })

    md.renderer.rules.unicode_emoji = (token: any[], idx: number): string =>
      token[idx].content

    const { code_block, code_inline, fence } = md.renderer.rules

    if (opts.unicode === 'twemoji') {
      const wrap = text =>
        text
          .split(/(<[^>]*>)/g)
          .reduce(
            (ret, part, idx) =>
              `${ret}${
                idx % 2
                  ? part
                  : part.replace(regexForSplit, ([emoji]) =>
                      twemojiParse(emoji)
                    )
              }`,
            ''
          )

      md.renderer.rules.unicode_emoji = twemojiRenderer

      md.renderer.rules.code_inline = (...args) => wrap(code_inline(...args))
      md.renderer.rules.code_block = (...args) => wrap(code_block(...args))
      md.renderer.rules.fence = (...args) => wrap(fence(...args))
    }
  }
}
