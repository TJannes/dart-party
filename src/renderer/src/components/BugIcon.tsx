/** A small beetle, drawn in the colour of the text around it. */
export function BugIcon(): React.JSX.Element {
  return (
    <svg className="bug-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M9 4.5 10.5 6.5M15 4.5 13.5 6.5" />
      <ellipse cx="12" cy="14" rx="5.5" ry="7" fill="currentColor" fillOpacity="0.25" />
      <path d="M12 7v14M6.5 11H3M6.5 15H3.5M7 19l-2.5 1.5M17.5 11H21M17.5 15h3M17 19l2.5 1.5" />
    </svg>
  )
}
