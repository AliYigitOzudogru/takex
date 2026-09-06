export interface AiProvider {
  generateNote(userInput: string): Promise<string>
}
