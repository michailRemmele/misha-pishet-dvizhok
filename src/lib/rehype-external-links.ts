interface HastNode {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
}

const isExternal = (href: unknown): boolean =>
  typeof href === 'string' && /^https?:\/\//i.test(href);

const visit = (node: HastNode): void => {
  if (node.tagName === 'a' && isExternal(node.properties?.href)) {
    node.properties = {
      ...node.properties,
      target: '_blank',
      rel: 'noopener noreferrer'
    };
  }

  node.children?.forEach(visit);
};

export const rehypeExternalLinks = () => visit;
