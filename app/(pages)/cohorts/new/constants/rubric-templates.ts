export interface CriterionTemplate {
    name: string;
    weight: number;
    description: string;
}

export interface RubricTemplate {
    id: string;
    title: string;
    icon: string;
    color: string;
    tag?: string;
    criteria: CriterionTemplate[];
}

export const RUBRIC_TEMPLATES: Record<string, RubricTemplate> = {
    "yc-standard": {
        id: "yc-standard",
        title: "Y Combinator Standard",
        icon: "🚀",
        color: "orange",
        tag: "Popular",
        criteria: [
            { name: "Team", weight: 30, description: "Assess founder experience, complementarity, grit, and commitment." },
            { name: "Traction", weight: 25, description: "Evidence of product-market fit, growth metrics, and user engagement." },
            { name: "Market", weight: 20, description: "Potential for a billion-dollar outcome and market dynamics." },
            { name: "Vision/Product", weight: 15, description: "Uniqueness of solution and clarity of long-term vision." },
            { name: "Diversity/Fit", weight: 10, description: "Commitment to diversity and alignment with YC culture." },
        ],
    },
    "techstars": {
        id: "techstars",
        title: "Techstars Accelerator",
        icon: "⚡",
        color: "blue",
        criteria: [
            { name: "Founders", weight: 35, description: "Founder capabilities, perseverance, and team chemistry." },
            { name: "Product", weight: 25, description: "Product innovation, technical feasibility, and differentiation." },
            { name: "Market", weight: 20, description: "Market size, target audience, and competitive landscape." },
            { name: "Traction", weight: 15, description: "Early results, customer validation, and growth rate." },
            { name: "Go-to-Market", weight: 5, description: "CLarity and viability of the acquisition strategy." },
        ],
    },
    "nsf-sbir": {
        id: "nsf-sbir",
        title: "NSF SBIR Grant",
        icon: "🔬",
        color: "purple",
        tag: "Grant-focused",
        criteria: [
            { name: "Innovation", weight: 40, description: "Scientific and technical innovation and feasibility." },
            { name: "Team", weight: 25, description: "Technical expertise and track record of the project team." },
            { name: "Commercial Potential", weight: 20, description: "Likelihood of commercial success and societal benefit." },
            { name: "Broader Impacts", weight: 15, description: "Potential to advance discovery and benefit society." },
        ],
    },
    "university-fellowship": {
        id: "university-fellowship",
        title: "University Fellowship",
        icon: "🎓",
        color: "indigo",
        criteria: [
            { name: "Academic Excellence", weight: 30, description: "GPA, honors, and academic achievement history." },
            { name: "Research Potential", weight: 30, description: "Quality of research proposal and past experience." },
            { name: "Leadership", weight: 20, description: "Evidence of leadership and community involvement." },
            { name: "Fit with Program", weight: 20, description: "Alignment with program goals and mentor availability." },
        ],
    },
    "climate-impact": {
        id: "climate-impact",
        title: "Climate Impact Fund",
        icon: "🌍",
        color: "green",
        criteria: [
            { name: "Impact Potential", weight: 40, description: "Quantifiable carbon reduction and environmental impact." },
            { name: "Team", weight: 25, description: "Experience in climate tech and project execution." },
            { name: "Scalability", weight: 20, description: "Potential for large-scale deployment and adoption." },
            { name: "Innovation", weight: 15, description: "Novelty of approach to climate challenges." },
        ],
    },
    "blank": {
        id: "blank",
        title: "Blank",
        icon: "✨",
        color: "gray",
        criteria: [
            { name: "Criterion 1", weight: 100, description: "Define your first evaluation criterion." },
        ],
    },
};

/**
 * Suggests a rubric template based on the program type.
 */
export function getSuggestedTemplateId(programType: string): string {
    const type = programType.toLowerCase();

    if (type.includes("accelerator") || type.includes("incubator")) {
        return "yc-standard";
    }
    if (type.includes("grant")) {
        return "nsf-sbir";
    }
    if (type.includes("fellowship") || type.includes("university")) {
        return "university-fellowship";
    }
    if (type.includes("climate") || type.includes("sustainability")) {
        return "climate-impact";
    }

    return "blank";
}
