export interface SocialLink {
  label: string;
  url: string;
  kicker: string;
  handle: string;
}

export const contactInfo = {
  headline: "Let's talk about what you're building.",
  subtitle:
    "Open for senior frontend roles, technical advisory, and high-impact web architectures. Reach out for collaboration or engineering opportunities.",
  email: "18mson@gmail.com",
  location: "Jakarta, Indonesia · UTC+7",
  availability: "Available for senior frontend opportunities",
  socials: [
    {
      label: "LinkedIn",
      url: "https://www.linkedin.com/in/muhamad-son-ani-549230153/",
      kicker: "Network",
      handle: "Muhamad Son'ani",
    },
    {
      label: "GitHub",
      url: "https://github.com/18mson",
      kicker: "Code & Repositories",
      handle: "github.com/18mson",
    },
  ] as SocialLink[],
};
