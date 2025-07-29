import {
  sendMessageToAllActiveSessions,
  getAllSessions,
} from '../../amplify/function/helpers/sendMessageToAllActiveSessions';
import { sendSessionMessage } from '../../amplify/function/helpers/sendSessionMessage';
import { getSessionApi } from '@jellyfin/sdk/lib/utils/api';
import { getAuthenticatedJellyfinApi } from '../../amplify/function/helpers/getAuthenticatedJellyfinApi';
import { SessionApi } from '@jellyfin/sdk/lib/generated-client/api/session-api';

// Mock dependencies
jest.mock('@jellyfin/sdk/lib/utils/api');
jest.mock('../../amplify/function/helpers/getAuthenticatedJellyfinApi');
jest.mock('../../amplify/function/helpers/sendSessionMessage');

describe('sendMessageToAllActiveSessions', () => {
  // Setup mocks
  const mockGetSessions = jest.fn();
  const mockSendMessageCommand = jest.fn();

  const mockSessionApi = {
    getSessions: mockGetSessions,
    sendMessageCommand: mockSendMessageCommand,
  } as unknown as SessionApi;

  const mockJellyfinApi = {
    // Mock whatever is needed from the Jellyfin API
  };

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Setup default mock implementations
    (getSessionApi as jest.Mock).mockReturnValue(mockSessionApi);
    (getAuthenticatedJellyfinApi as jest.Mock).mockResolvedValue(mockJellyfinApi);
    (sendSessionMessage as jest.Mock).mockResolvedValue(undefined);
  });

  test('should get all sessions', async () => {
    // Arrange
    const mockSessions = { data: [{ Id: '1', UserName: 'User1', DeviceName: 'Device1' }] };
    mockGetSessions.mockResolvedValue(mockSessions);

    // Act
    const result = await getAllSessions(mockSessionApi);

    // Assert
    expect(mockGetSessions).toHaveBeenCalledTimes(1);
    expect(result).toEqual(mockSessions);
  });

  test('should send messages to all valid active sessions', async () => {
    // Arrange
    const mockSessions = {
      data: [
        { Id: '1', UserName: 'User1', DeviceName: 'Device1' },
        { Id: '2', UserName: 'User2', DeviceName: 'Device2' },
        { Id: '3', UserName: 'User3', DeviceName: 'SendMessageToAllActiveSessions' }, // Should be filtered out
        { Id: '4', UserName: 'User4', DeviceName: 'Jellyfin-Wrapped' }, // Should be filtered out
        { Id: '5', UserName: 'User5', DeviceName: 'Jellyseerr' }, // Should be filtered out
        { Id: '6', UserName: 'User6', DeviceName: 'Device6' },
      ],
    };
    mockGetSessions.mockResolvedValue(mockSessions);

    // Act
    const messagesSent = await sendMessageToAllActiveSessions('Test message', 'Test');

    // Assert
    expect(getAuthenticatedJellyfinApi).toHaveBeenCalledTimes(1);
    expect(getSessionApi).toHaveBeenCalledTimes(1);
    expect(mockGetSessions).toHaveBeenCalledTimes(1);

    // Should send messages to 3 valid sessions (excluding the 3 filtered ones)
    expect(sendSessionMessage).toHaveBeenCalledTimes(3);
    expect(sendSessionMessage).toHaveBeenCalledWith(mockSessionApi, '1', 'Test message', 'Test');
    expect(sendSessionMessage).toHaveBeenCalledWith(mockSessionApi, '2', 'Test message', 'Test');
    expect(sendSessionMessage).toHaveBeenCalledWith(mockSessionApi, '6', 'Test message', 'Test');

    // Should return the count of messages sent
    expect(messagesSent).toBe(3);
  });

  test('should handle empty session list', async () => {
    // Arrange
    const mockSessions = { data: [] };
    mockGetSessions.mockResolvedValue(mockSessions);

    // Act
    const messagesSent = await sendMessageToAllActiveSessions('Test message', 'Test');

    // Assert
    expect(mockGetSessions).toHaveBeenCalledTimes(1);
    expect(sendSessionMessage).not.toHaveBeenCalled();
    expect(messagesSent).toBe(0);
  });

  test('should handle sessions without IDs', async () => {
    // Arrange
    const mockSessions = {
      data: [
        { UserName: 'User1', DeviceName: 'Device1' }, // No ID
        { Id: '2', UserName: 'User2', DeviceName: 'Device2' },
      ],
    };
    mockGetSessions.mockResolvedValue(mockSessions);

    // Act
    const messagesSent = await sendMessageToAllActiveSessions('Test message', 'Test');

    // Assert
    expect(mockGetSessions).toHaveBeenCalledTimes(1);
    expect(sendSessionMessage).toHaveBeenCalledTimes(1);
    expect(sendSessionMessage).toHaveBeenCalledWith(mockSessionApi, '2', 'Test message', 'Test');
    expect(messagesSent).toBe(1);
  });
});
