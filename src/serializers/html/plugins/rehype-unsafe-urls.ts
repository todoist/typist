import { visit } from 'unist-util-visit'

import { isHastElementNode } from '../../../helpers/unified'

import type { Node as HastNode } from 'hast'
import type { Transformer } from 'unified'

/**
 * The regular expression to match link URLs with schemes that can execute scripts.
 */
const UNSAFE_URL_REGEX = /^(?:javascript|vbscript|data):/i

/**
 * A rehype plugin to remove the URL from links with schemes that can execute scripts (e.g.,
 * `javascript:`), preventing XSS attacks when the serialized HTML is rendered.
 */
function rehypeUnsafeUrls(): Transformer {
    return (...[tree]: Parameters<Transformer>): ReturnType<Transformer> => {
        visit(tree, 'element', (node: HastNode) => {
            if (
                isHastElementNode(node, 'a') &&
                typeof node.properties.href === 'string' &&
                UNSAFE_URL_REGEX.test(node.properties.href)
            ) {
                delete node.properties.href
            }
        })

        return tree
    }
}

export { rehypeUnsafeUrls }
