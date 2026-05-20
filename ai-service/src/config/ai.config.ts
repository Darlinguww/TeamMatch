// Configuración centralizada de proveedores de IA (M2 Gemini + M3 Azure OpenAI)
export const aiConfig = {
  azureOpenAI: {
    endpoint: process.env.AZURE_OPENAI_ENDPOINT!,
    apiKey: process.env.AZURE_OPENAI_API_KEY!,
    deploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME!,
    apiVersion: process.env.AZURE_OPENAI_API_VERSION ?? '2025-04-01-preview',
  },
  gemini: {
    // No modificar — lo gestiona el módulo M2
    apiKey: process.env.GEMINI_API_KEY!,
  },
};
