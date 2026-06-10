class AuthSession {
  const AuthSession({
    required this.accessToken,
    required this.phoneNumber,
  });

  final String accessToken;
  final String phoneNumber;
}
