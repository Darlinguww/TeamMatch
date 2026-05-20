// Configuración centralizada de Azure OpenAI (gpt-4.1-mini)
export const aiConfig = {
  azureOpenAI: {
    endpoint: process.env.AZURE_OPENAI_ENDPOINT!,
    apiKey: process.env.AZURE_OPENAI_API_KEY!,
    deploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME ?? 'gpt-4.1-mini',
    apiVersion: process.env.AZURE_OPENAI_API_VERSION ?? '2025-04-01-preview',
  },
};

export function isAzureOpenAIConfigured(): boolean {
  const { endpoint, apiKey, deploymentName } = aiConfig.azureOpenAI;
  return Boolean(
    String(endpoint ?? '').trim() &&
      String(apiKey ?? '').trim() &&
      String(deploymentName ?? '').trim(),
  );
}
