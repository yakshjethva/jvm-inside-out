/** Walkthroughs and dissections worth opening first, as explorer deep links. */
export const HOME_EXHIBITS: {
  kind: 'walkthrough' | 'inside';
  id: string;
  to: string;
}[] = [
  { kind: 'walkthrough', id: 'launch', to: '/anatomy?mode=execution&s=launch' },
  { kind: 'walkthrough', id: 'new-person', to: '/anatomy?mode=execution&s=new-person' },
  { kind: 'inside', id: 'heap', to: '/anatomy?c=heap&mode=internal' },
  { kind: 'walkthrough', id: 'jit', to: '/anatomy?mode=execution&s=jit' },
  { kind: 'inside', id: 'stack-frame', to: '/anatomy?c=stack-frame&mode=internal' },
  { kind: 'walkthrough', id: 'young-gc', to: '/anatomy?mode=execution&s=young-gc' },
];
