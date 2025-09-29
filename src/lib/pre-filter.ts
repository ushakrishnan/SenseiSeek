// Lightweight pre-filter for candidate reduction before expensive vector/LLM steps.
import { StartupNeeds, ExecutiveProfile } from './types';

function normalizeListField(v: any): string[] {
    if (!v) return [];
    if (Array.isArray(v)) return v.map(item => String(item).toLowerCase().trim());
    return String(v).split(/[;,|]/).map(s => s.trim().toLowerCase()).filter(Boolean);
}

export function preFilterExecutives(executives: ExecutiveProfile[], startup: any, maxCandidates = Number(process.env.MATCH_PRE_FILTER_MAX || 200)) {
    const required = normalizeListField(startup.requiredExpertise);
    const needBudget = Number(startup.budget) || 0;

    // Compute a simple heuristic score per executive
    const scored = executives.map(exec => {
        const execExp = normalizeListField(exec.expertise);
        const common = execExp.filter(e => required.includes(e)).length;

        let score = common * 2; // expertise overlap is primary signal

        // availability: prefer matching availability strings
        try {
            const avail = String(exec.availability || '').toLowerCase();
            if (avail && String(startup.availability || '').toLowerCase() === avail) score += 1;
            if (avail.includes('immediate') && String(startup.availability || '').toLowerCase().includes('immediate')) score += 1;
        } catch (e) { }

        // compensation: if both numbers are present, prefer executives whose desired <= budget*1.2
        const desired = Number(exec.desiredCompensation || 0);
        if (needBudget && desired) {
            if (desired <= needBudget * 1.2) score += 1;
            else if (desired > needBudget * 2) score -= 1;
        }

        // small signal for any GitHub insights / resume presence
        if (exec.githubInsights) score += 0.2;
        const accomplishments = Array.isArray(exec.keyAccomplishments) ? exec.keyAccomplishments.length : 0;
        score += Math.min(1, accomplishments / 5);

        return { exec, score };
    });

    scored.sort((a, b) => b.score - a.score);
    const selected = scored.slice(0, Math.max(10, Math.min(maxCandidates, scored.length))).map(s => s.exec);
    return selected;
}

export default preFilterExecutives;
