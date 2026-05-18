// Cliente singleton para Azure OpenAI (M3 — Matchmaking)
import { AzureOpenAI } from 'openai';
import { aiConfig } from '../../config/ai.config.js';

let _client: AzureOpenAI | null = null;

function createClient(): AzureOpenAI {
  const { endpoint, apiKey, apiVersion, deploymentName } = aiConfig.azureOpenAI;

  if (!endpoint || !apiKey) {
    throw new Error(
      'Azure OpenAI no configurado. Verifica AZURE_OPENAI_ENDPOINT y AZURE_OPENAI_API_KEY en .env',
    );
  }

  if (!deploymentName) {
    throw new Error(
      'Azure OpenAI no configurado. Verifica AZURE_OPENAI_DEPLOYMENT_NAME en .env',
    );
  }

  return new AzureOpenAI({
    endpoint,
    apiKey,
    apiVersion,
    deployment: deploymentName,
  });
}

/** Inicializa el cliente al arrancar el servicio (M3) */
export function initAzureOpenAIClient(): AzureOpenAI {
  if (!_client) {
    _client = createClient();
    const { deploymentName, apiVersion } = aiConfig.azureOpenAI;
    console.log(
      `[ai-service] Azure OpenAI listo — deployment: ${deploymentName}, apiVersion: ${apiVersion}`,
    );
  }
  return _client;
}

export function getAzureOpenAIClient(): AzureOpenAI {
  if (!_client) {
    _client = createClient();
  }
  return _client;
}
