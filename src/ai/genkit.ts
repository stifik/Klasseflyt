import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// Temporarily commented out to debug deployment issues.
// The Genkit initialization might be causing the container to fail on start
// if environment variables like API keys are not set in the production environment.
/*
export const ai = genkit({
  plugins: [googleAI()],
  model: 'googleai/gemini-2.0-flash',
});
*/

// Add a placeholder export to prevent import errors in other files.
export const ai = {};
