import { InputRule, markInputRule, markPasteRule, PasteRule } from '@tiptap/core'
import { isAllowedUri, Link } from '@tiptap/extension-link'

import type { ExtendedRegExpMatchArray } from '@tiptap/core'
import type { LinkOptions } from '@tiptap/extension-link'

/**
 * The input regex for Markdown links with title support, and multiple quotation marks (required
 * in case the `Typography` extension is being included).
 */
const inputRegex = /(?:^|\s)\[([^\]]*)?\]\((\S+)(?: ["“](.+)["”])?\)$/i

/**
 * The paste regex for Markdown links with title support, and multiple quotation marks (required
 * in case the `Typography` extension is being included).
 */
const pasteRegex = /(?:^|\s)\[([^\]]*)?\]\((\S+)(?: ["“](.+)["”])?\)/gi

/**
 * Creates the `getAttributes` function for the Markdown link input and paste rules, which skips
 * matches with link URLs not allowed by the `isAllowedUri` option of the `Link` extension
 * (matching the validation of the built-in `setLink` and `toggleLink` commands).
 *
 * @param options The options of the `Link` extension.
 *
 * @returns The `getAttributes` function for the Markdown link input and paste rules.
 */
function createGetLinkAttributes(options: LinkOptions) {
    return (match: ExtendedRegExpMatchArray) => {
        // We need to use `pop()` to remove the last capture groups from the match to satisfy
        // Tiptap's `markInputRule` and `markPasteRule` expectation of having the content as the
        // last capture group in the match (this makes the attribute order important)
        const title = match.pop()?.trim()
        const href = match.pop()?.trim()

        // Skip the rule for link URLs not allowed by the `isAllowedUri` option
        if (
            !href ||
            !options.isAllowedUri(href, {
                defaultValidate: (url) => Boolean(isAllowedUri(url, options.protocols)),
                protocols: options.protocols,
                defaultProtocol: options.defaultProtocol,
            })
        ) {
            return false
        }

        return { title, href }
    }
}

/**
 * Input rule built specifically for the `Link` extension, which ignores the auto-linked URL in
 * parentheses (e.g., `(https://doist.dev)`).
 *
 * @see https://github.com/ueberdosis/tiptap/discussions/1865
 */
function linkInputRule(config: Parameters<typeof markInputRule>[0]) {
    const defaultMarkInputRule = markInputRule(config)

    return new InputRule({
        find: config.find,
        handler(props) {
            const { tr } = props.state

            defaultMarkInputRule.handler(props)
            tr.setMeta('preventAutolink', true)
        },
    })
}

/**
 * Paste rule built specifically for the `Link` extension, which ignores the auto-linked URL in
 * parentheses (e.g., `(https://doist.dev)`). This extension was inspired from the multiple
 * implementations found in a Tiptap discussion at GitHub.
 *
 * @see https://github.com/ueberdosis/tiptap/discussions/1865
 */
function linkPasteRule(config: Parameters<typeof markPasteRule>[0]) {
    const defaultMarkPasteRule = markPasteRule(config)

    return new PasteRule({
        find: config.find,
        handler(props) {
            const { tr } = props.state

            defaultMarkPasteRule.handler(props)
            tr.setMeta('preventAutolink', true)
        },
    })
}

/**
 * The options available to customize the `RichTextLink` extension.
 */
type RichTextLinkOptions = LinkOptions

/**
 * Custom extension that extends the built-in `Link` extension to add additional input/paste rules
 * for converting the Markdown link syntax (i.e. `[Doist](https://doist.com)`) into links, and also
 * adds support for the `title` attribute.
 */
const RichTextLink = Link.extend<RichTextLinkOptions>({
    inclusive: false,
    addOptions() {
        return {
            ...this.parent?.(),
            openOnClick: 'whenNotEditable',
        }
    },
    addAttributes() {
        return {
            ...this.parent?.(),
            title: {
                default: null,
            },
        }
    },
    addInputRules() {
        return [
            linkInputRule({
                find: inputRegex,
                type: this.type,
                getAttributes: createGetLinkAttributes(this.options),
            }),
        ]
    },
    addPasteRules() {
        return [
            linkPasteRule({
                find: pasteRegex,
                type: this.type,
                getAttributes: createGetLinkAttributes(this.options),
            }),
        ]
    },
})

export { RichTextLink }

export type { RichTextLinkOptions }
