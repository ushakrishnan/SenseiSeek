// scripts/generate-openapi.js
// Lightweight generator: merges an existing public/openapi.json (if present)
// and injects OpenAPI component schemas mapped from the project's Zod schemas
// (a manual mapping for the exported schemas in src/lib/schemas.ts).
const fs = require('fs');
const path = require('path');

const out = path.join(process.cwd(), 'public', 'openapi.json');

function readExisting() {
    try {
        const raw = fs.readFileSync(out, 'utf8');
        return JSON.parse(raw);
    } catch (e) {
        return {
            openapi: '3.0.1',
            info: { title: 'SenseiSeek API', version: '1.1.0' },
            paths: {},
        };
    }
}

const api = readExisting();

// Manually mapped OpenAPI schemas derived from src/lib/schemas.ts exports.
// This is intentionally explicit and small — it covers the primary request
// bodies (executive, startup needs, signup, contact) so clients get concrete
// requestContracts. Add more mappings as needed.
const components = api.components || {};
components.schemas = components.schemas || {};

components.schemas.ExecutiveProfile = {
    type: 'object',
    properties: {
        name: { type: 'string' },
        photoUrl: { type: 'string', nullable: true },
        githubHandle: { type: 'string', nullable: true },
        githubInsights: { type: 'string', nullable: true },
        expertise: { type: 'string' },
        industryExperience: { type: 'array', items: { type: 'string' } },
        availability: { type: 'string' },
        desiredCompensation: { type: 'string' },
        locationPreference: { type: 'string' },
        city: { type: 'string', nullable: true },
        state: { type: 'string', nullable: true },
        country: { type: 'string', nullable: true },
        keyAccomplishments: { type: 'array', items: { type: 'object', properties: { value: { type: 'string' } } } },
        links: {
            type: 'object',
            properties: {
                linkedinProfile: { type: 'string', nullable: true },
                personalWebsite: { type: 'string', nullable: true },
                portfolio: { type: 'string', nullable: true },
            },
        },
        resumeText: { type: 'string', nullable: true },
    },
    required: ['name', 'expertise', 'industryExperience', 'availability', 'desiredCompensation', 'locationPreference', 'keyAccomplishments'],
};

components.schemas.StartupProfile = {
    type: 'object',
    properties: {
        userName: { type: 'string' },
        userEmail: { type: 'string', format: 'email' },
        yourRole: { type: 'string' },
        companyName: { type: 'string' },
        companyWebsite: { type: 'string', nullable: true },
        companyLogoUrl: { type: 'string', nullable: true },
        industry: { type: 'array', items: { type: 'string' } },
        investmentStage: { type: 'string', nullable: true },
        investmentRaised: { type: 'string', nullable: true },
        largestInvestor: { type: 'string', nullable: true },
        shortDescription: { type: 'string' },
        currentChallenge: { type: 'string' },
        whyUs: { type: 'string' },
    },
    required: ['userName', 'userEmail', 'yourRole', 'companyName', 'industry', 'shortDescription', 'currentChallenge', 'whyUs'],
};

components.schemas.StartupNeeds = {
    type: 'object',
    properties: {
        companyName: { type: 'string' },
        companyStage: { type: 'string' },
        roleTitle: { type: 'string' },
        roleSummary: { type: 'string' },
        keyDeliverables: { type: 'string' },
        keyChallenges: { type: 'string', nullable: true },
        requiredExpertise: { type: 'array', items: { type: 'string' } },
        engagementLength: { type: 'string' },
        budget: { type: 'string' },
        locationPreference: { type: 'string' },
        links: {
            type: 'object',
            properties: {
                companyWebsite: { type: 'string', nullable: true },
                jobPosting: { type: 'string', nullable: true },
                linkedinProfile: { type: 'string', nullable: true },
            },
        },
        status: { type: 'string', enum: ['active', 'inactive'] },
        creatorId: { type: 'string', nullable: true },
        projectScope: { type: 'string', nullable: true },
    },
    required: ['companyName', 'companyStage', 'roleTitle', 'roleSummary', 'keyDeliverables', 'requiredExpertise', 'engagementLength', 'budget', 'locationPreference'],
};

components.schemas.Signup = {
    type: 'object',
    properties: {
        name: { type: 'string' },
        email: { type: 'string', format: 'email' },
        password: { type: 'string' },
        confirmPassword: { type: 'string' },
        role: { type: 'string', enum: ['startup', 'executive'] },
    },
    required: ['name', 'email', 'password', 'confirmPassword', 'role'],
};

components.schemas.ContactForm = {
    type: 'object',
    properties: {
        name: { type: 'string' },
        email: { type: 'string', format: 'email' },
        subject: { type: 'string' },
        message: { type: 'string' },
    },
    required: ['name', 'email', 'subject', 'message'],
};

api.components = components;

// Attach requestBody references for key paths present in the spec.
function addRequestBody(path, method, schemaRef, description) {
    if (!api.paths[path] || !api.paths[path][method]) return;
    api.paths[path][method].requestBody = {
        description: description || 'Request payload',
        content: {
            'application/json': {
                schema: { $ref: `#/components/schemas/${schemaRef}` },
            },
        },
        required: true,
    };
    api.paths[path][method].responses = api.paths[path][method].responses || {
        '200': { description: 'OK' },
    };
}

addRequestBody('/api/executives', 'post', 'ExecutiveProfile', 'Executive profile payload');
addRequestBody('/api/startups/needs', 'post', 'StartupNeeds', 'Startup need payload');
addRequestBody('/api/startups/needs/{id}', 'put', 'StartupNeeds', 'Startup need update payload');
addRequestBody('/api/auth/signup', 'post', 'Signup', 'Signup payload');
// If a contact route exists, wire it up (safe no-op if missing)
addRequestBody('/api/contact', 'post', 'ContactForm', 'Contact form payload');

// Update info.version to indicate generated stamp
api.info = api.info || {};
api.info.version = api.info.version || '1.1.0';

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(api, null, 2) + '\n');
console.log('Wrote', out);
