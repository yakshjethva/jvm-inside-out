/** Site-wide metadata. The repository URL is used for "edit on GitHub" and contribution links. */
export const SITE = {
  name: 'JVM Atlas',
  tagline: 'Explore the machine behind Java programs.',
  description:
    'An independent interactive atlas of the Java Virtual Machine: runtime architecture, memory management and execution, explained at three levels with verified examples and primary sources.',
  /** Required wording; see docs/BRAND_GUIDELINES.md. */
  independence:
    'JVM Atlas is an independent educational project and is not affiliated with or endorsed by Oracle.',
  trademarks:
    'Java and OpenJDK are trademarks or registered trademarks of Oracle and/or its affiliates.',
  repository: 'https://github.com/yakshjethva/jvm-inside-out',
  specVersion: 'Java SE 25',
  implementationVersion: 'OpenJDK HotSpot, JDK 25',
} as const;

export interface NavItem {
  to: string;
  label: string;
  description: string;
}

/**
 * Primary navigation, in the order a new visitor needs it. The logo is the
 * link home; the mobile menu lists Home explicitly. Only pages that exist in
 * this release are listed.
 */
export const PRIMARY_NAV: NavItem[] = [
  {
    to: '/start',
    label: 'Start here',
    description: 'A guided first lesson: what happens when you run a Java program',
  },
  {
    to: '/anatomy',
    label: 'Explore anatomy',
    description: 'The interactive atlas of the machine that runs Java',
  },
  {
    to: '/learn',
    label: 'Learn',
    description: 'Guides and learning paths that begin with a question',
  },
  { to: '/glossary', label: 'Glossary', description: 'Every technical term, in plain words' },
  {
    to: '/references',
    label: 'References',
    description: 'Specifications, JEPs and source code we cite',
  },
  { to: '/about', label: 'About', description: 'Why JVM Atlas exists, versions and accuracy' },
];

/**
 * The laboratories: deep, interactive explorations of one part of the machine.
 * In the header they share one "Labs" menu; the mobile menu and the footer
 * list them directly.
 */
export const LABS_NAV: NavItem[] = [
  {
    to: '/class-loading',
    label: 'Class loader explorer',
    description: 'Loaders, delegation and the life of a class, step by step',
  },
  {
    to: '/memory',
    label: 'Memory laboratory',
    description: 'Stack, heap, frames, object layouts and native memory',
  },
];

/** The laboratory that explores each region of the anatomy in depth. */
export const LAB_FOR_REGION: Record<string, NavItem> = {
  'class-loader-subsystem': LABS_NAV[0]!,
  'runtime-data-areas': LABS_NAV[1]!,
};

/** Project pages, linked from the footer and the About page. */
export const PROJECT_NAV: NavItem[] = [
  {
    to: '/contributing',
    label: 'Contributing',
    description: 'How to improve the content and code',
  },
  {
    to: '/about#project-status',
    label: 'Project status',
    description: 'What is built and what comes next',
  },
];
