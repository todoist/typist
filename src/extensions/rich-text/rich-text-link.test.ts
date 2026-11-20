import { createRichTextEditor } from '../../../test-utils/rich-text-editor'

import type { Editor } from '@tiptap/core'

/**
 * Simulates typing the given text one character at a time through the editor's text input
 * handlers (the same code path real typing takes, minus the DOM event plumbing), inserting each
 * character that no handler takes care of.
 */
function typeText(editor: Editor, text: string): void {
    for (const character of text) {
        const { from, to } = editor.state.selection
        const insertCharacter = () => editor.state.tr.insertText(character, from, to)

        const isHandled = editor.view.someProp('handleTextInput', (handleTextInput) =>
            handleTextInput(editor.view, from, to, character, insertCharacter),
        )

        if (!isHandled) {
            editor.view.dispatch(insertCharacter())
        }
    }
}

/**
 * Simulates pasting the given plain text into the editor by inserting it in a transaction tagged
 * as a paste, which is what triggers the editor's paste rules.
 */
function pasteText(editor: Editor, text: string): void {
    editor.view.dispatch(editor.state.tr.insertText(text).setMeta('uiEvent', 'paste'))
}

describe('Extension: RichTextLink', () => {
    describe('when typing a Markdown link', () => {
        test('converts a link with an allowed URL', () => {
            const editor = createRichTextEditor('')

            typeText(editor, '[click](https://doist.com)')

            expect(editor.getHTML()).toBe(
                '<p><a target="_blank" rel="noopener noreferrer nofollow" href="https://doist.com">click</a></p>',
            )
        })

        test('keeps a link with a URL not allowed by `isAllowedUri` as text', () => {
            const editor = createRichTextEditor('')

            typeText(editor, '[click](javascript:alert(1))')

            expect(editor.getHTML()).toBe('<p>[click](javascript:alert(1))</p>')
        })

        test('converts a link with a URL allowed by a custom `isAllowedUri` option', () => {
            const editor = createRichTextEditor('', { link: { isAllowedUri: () => true } })

            typeText(editor, '[click](todoist://task?id=1)')

            expect(editor.getHTML()).toBe(
                '<p><a target="_blank" rel="noopener noreferrer nofollow" href="todoist://task?id=1">click</a></p>',
            )
        })
    })

    describe('when pasting Markdown links', () => {
        test('converts links with allowed URLs and keeps links with disallowed URLs as text', () => {
            const editor = createRichTextEditor('')

            pasteText(editor, '[safe](https://doist.com) [unsafe](javascript:alert(1))')

            expect(editor.getHTML()).toBe(
                '<p><a target="_blank" rel="noopener noreferrer nofollow" href="https://doist.com">safe</a> [unsafe](javascript:alert(1))</p>',
            )
        })
    })
})
