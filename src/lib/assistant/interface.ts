/**
 * Interface pour l'implémentation de l'assistant
 */
export interface IAssistantService {
  /**
   * Traite une commande utilisateur et retourne la réponse de l'assistant
   * @param userInput - La commande ou question de l'utilisateur
   * @returns La réponse de l'assistant (peut être du texte ou du JSON stringifié)
   */
  processProjectCommand(userInput: string): Promise<string>;
}
