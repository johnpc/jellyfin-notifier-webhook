import { sendSessionMessage } from '../../amplify/function/helpers/sendSessionMessage';
import { SessionApi } from '@jellyfin/sdk/lib/generated-client/api/session-api';

describe('sendSessionMessage', () => {
  const mockSessionApi = {
    sendMessageCommand: jest.fn(),
  } as unknown as SessionApi;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should send message with correct parameters', async () => {
    // Arrange
    const sessionId = 'test-session-id';
    const message = 'Test message';
    mockSessionApi.sendMessageCommand.mockResolvedValue(undefined);

    // Act
    await sendSessionMessage(mockSessionApi, sessionId, message);

    // Assert
    expect(mockSessionApi.sendMessageCommand).toHaveBeenCalledTimes(1);
    expect(mockSessionApi.sendMessageCommand).toHaveBeenCalledWith({
      sessionId: sessionId,
      messageCommand: {
        Text: message,
        TimeoutMs: 10000,
      },
    });
  });

  test('should handle API errors', async () => {
    // Arrange
    const sessionId = 'test-session-id';
    const message = 'Test message';
    const error = new Error('API Error');
    mockSessionApi.sendMessageCommand.mockRejectedValue(error);

    // Act & Assert
    await expect(sendSessionMessage(mockSessionApi, sessionId, message)).rejects.toThrow('API Error');
  });
});
