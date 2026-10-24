/**
 * Standard Bedrock error handler.
 * Prevents AWS credentials, stack traces, and internal AWS details from leaking to clients.
 */
export function handleBedrockError(err, res, defaultMsg = 'Upstream Bedrock service returned an error.') {
  const errorName = err?.name || 'UnknownError';
  console.error(`Bedrock invocation error: ${errorName}`);

  if (
    errorName === 'CredentialsProviderError' ||
    errorName === 'ExpiredTokenException' ||
    errorName === 'UnrecognizedClientException' ||
    errorName === 'InvalidSignatureException' ||
    errorName === 'NoCredentials' ||
    errorName.toLowerCase().includes('credential') ||
    errorName.toLowerCase().includes('token')
  ) {
    return res.status(503).json({
      error: 'Service Unavailable',
      message: 'AWS credentials are missing, expired, or invalid.',
    });
  }

  if (errorName === 'AccessDeniedException') {
    return res.status(502).json({
      error: 'Bad Gateway',
      message: 'Access denied to Bedrock model. Ensure model access is enabled in us-east-1.',
    });
  }

  if (
    errorName === 'ThrottlingException' ||
    errorName === 'ServiceQuotaExceededException' ||
    errorName === 'TooManyRequestsException'
  ) {
    return res.status(429).json({
      error: 'Too Many Requests',
      message: 'Rate limit or service quota exceeded for Bedrock API.',
    });
  }

  if (errorName === 'TimeoutError' || errorName === 'AbortError') {
    return res.status(504).json({
      error: 'Gateway Timeout',
      message: 'Request to Amazon Bedrock timed out.',
    });
  }

  return res.status(502).json({
    error: 'Bad Gateway',
    message: defaultMsg,
  });
}
