export interface SocialLink {
  label: string;
  url: string;
}

export const contactInfo = {
  headline: "Let's build thoughtful engineering together.",
  subtitle:
    "Open for senior frontend roles, technical advisory, and high-impact web architectures. Reach out for collaboration or engineering opportunities.",
  email: "muhamadsonani@gmail.com",
  location: "Jakarta, Indonesia · UTC+7",
  availability: "Available for senior frontend opportunities",
  socials: [
    { label: "LinkedIn", url: "https://linkedin.com/in/muhamad-son-ani" },
    { label: "GitHub", url: "https://github.com/sonanimuhamad" },
  ] as SocialLink[],
};
