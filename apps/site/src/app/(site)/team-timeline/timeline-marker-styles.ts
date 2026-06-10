export const timelineMarkerStyles = `
  .timeline-marker-ring {
    animation: timeline-marker-ring var(--active-marker-animation-ms) cubic-bezier(0.22, 1, 0.36, 1) infinite;
  }

  .timeline-marker-halo {
    animation: timeline-marker-halo var(--active-marker-animation-ms) cubic-bezier(0.16, 1, 0.3, 1) infinite;
    animation-delay: calc(var(--active-marker-animation-ms) * -0.28);
  }

  .timeline-marker-core {
    animation: timeline-marker-core var(--active-marker-animation-ms) cubic-bezier(0.37, 0, 0.63, 1) infinite;
  }

  @keyframes timeline-marker-ring {
    0% {
      opacity: 0;
      transform: scale(0.72);
      border-color: rgba(186, 230, 253, 0);
    }
    14% {
      opacity: 0.86;
      transform: scale(0.88);
      border-color: rgba(186, 230, 253, 0.72);
    }
    58% {
      opacity: 0.3;
      transform: scale(1.22);
      border-color: rgba(125, 211, 252, 0.34);
    }
    100% {
      opacity: 0;
      transform: scale(1.46);
      border-color: rgba(125, 211, 252, 0);
    }
  }

  @keyframes timeline-marker-halo {
    0% {
      opacity: 0;
      transform: scale(0.78);
    }
    16% {
      opacity: 0.42;
      transform: scale(0.92);
    }
    62% {
      opacity: 0.2;
      transform: scale(1.18);
    }
    100% {
      opacity: 0;
      transform: scale(1.36);
    }
  }

  @keyframes timeline-marker-core {
    0%,
    100% {
      transform: scale(1);
      background-color: rgba(125, 211, 252, 0.78);
      box-shadow: 0 0 14px 5px rgba(125, 211, 252, 0.48);
    }
    46% {
      transform: scale(1.1);
      background-color: rgba(186, 230, 253, 0.92);
      box-shadow: 0 0 18px 7px rgba(125, 211, 252, 0.64);
    }
    72% {
      transform: scale(0.98);
      background-color: rgba(125, 211, 252, 0.84);
      box-shadow: 0 0 15px 5px rgba(125, 211, 252, 0.52);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .timeline-marker-ring,
    .timeline-marker-halo,
    .timeline-marker-core {
      animation: none;
    }
  }
`
