import { sendSessionMessage } from '../../amplify/function/helpers/sendSessionMessage';
import { SessionApi } from '@jellyfin/sdk/lib/generated-client/api/session-api';

describe('sendSessionMessage', () => {
  const mockSendMessageCommand = jest.fn();
  const mockSessionApi = {
    sendMessageCommand: mockSendMessageCommand,
  } as unknown as SessionApi;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should send message with correct parameters', async () => {
    // Arrange
    const sessionId = 'test-session-id';
    const message = 'Test message';
    const header = 'Test header';
    mockSendMessageCommand.mockResolvedValue(undefined);

    // Act
    await sendSessionMessage(mockSessionApi, sessionId, message, header);

    // Assert
    expect(mockSendMessageCommand).toHaveBeenCalledTimes(1);
    expect(mockSendMessageCommand).toHaveBeenCalledWith({
      sessionId: sessionId,
      messageCommand: {
        Text: message,
        Header: header,
        TimeoutMs: 5000,
      },
    });
  });

  test('should handle API errors', async () => {
    // Arrange
    const sessionId = 'test-session-id';
    const message = 'Test message';
    const header = 'Test header';
    const error = new Error('API Error');
    mockSendMessageCommand.mockRejectedValue(error);

    // Act & Assert
    await expect(sendSessionMessage(mockSessionApi, sessionId, message, header)).rejects.toThrow('API Error');
  });
});
