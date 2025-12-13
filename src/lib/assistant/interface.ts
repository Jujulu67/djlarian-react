/**
 * Interface commune pour les implémentations OLD et NEW de l'assistant
 * Permet de basculer entre les deux versions sans modifier le code appelant
 */
export interface IAssistantService {
  /**
   * Traite une commande utilisateur et retourne la réponse de l'assistant
   * @param userInput - La commande ou question de l'utilisateur
   * @returns La réponse de l'assistant (peut être du texte ou du JSON stringifié)
   */
  processProjectCommand(userInput: string): Promise<string>;
}
