import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:parentconnect/api/client.dart';
import 'package:parentconnect/help_store.dart';
import 'package:parentconnect/main.dart';
import 'package:parentconnect/screens/help_screen.dart';
import 'package:shared_preferences/shared_preferences.dart';

ApiClient clientReturning(Object body, {int status = 200}) => ApiClient(
      baseUrl: 'http://test',
      httpClient: MockClient((_) async => http.Response(jsonEncode(body), status)),
    );

ApiClient failingClient() => ApiClient(
      baseUrl: 'http://test',
      httpClient: MockClient((_) async => http.Response('nope', 500)),
    );

const _contact = {
  'name': 'Isange One Stop Centre',
  'phone': '+250700000000',
  'type': 'one_stop_centre',
};

void main() {
  setUp(() => SharedPreferences.setMockInitialValues({}));

  testWidgets('opens on the coach, with the AI clearly labelled (D4)', (tester) async {
    await tester.pumpWidget(ParentConnectApp(api: clientReturning(const [])));
    await tester.pump();

    expect(find.text('Coach'), findsWidgets);
    expect(find.textContaining('An AI coach'), findsOneWidget);
  });

  testWidgets('"Get help" is always one tap away from the coach (J9)', (tester) async {
    await tester.pumpWidget(ParentConnectApp(api: clientReturning(const [_contact])));
    await tester.pump();

    await tester.tap(find.text('Get help'));
    await tester.pumpAndSettle();

    expect(find.textContaining('If you or someone you know is in danger'), findsOneWidget);
  });

  testWidgets('help screen shows contacts fetched from the API', (tester) async {
    final store = HelpStore(api: clientReturning(const [_contact]));
    await tester.pumpWidget(MaterialApp(home: HelpScreen(store: store)));
    await tester.pumpAndSettle();

    expect(find.text('Isange One Stop Centre'), findsOneWidget);
    expect(find.textContaining('+250700000000'), findsOneWidget);
  });

  testWidgets('help screen still shows cached contacts when the network fails (NFR-06)', (tester) async {
    // Simulate a previous successful sync having cached the directory.
    SharedPreferences.setMockInitialValues({
      'referral_directory_v1': jsonEncode([_contact]),
    });

    final store = HelpStore(api: failingClient());
    await tester.pumpWidget(MaterialApp(home: HelpScreen(store: store)));
    await tester.pumpAndSettle();

    expect(find.text('Isange One Stop Centre'), findsOneWidget);
  });

  testWidgets('help screen explains itself when nothing is cached yet', (tester) async {
    final store = HelpStore(api: failingClient());
    await tester.pumpWidget(MaterialApp(home: HelpScreen(store: store)));
    await tester.pumpAndSettle();

    expect(find.textContaining('not downloaded yet'), findsOneWidget);
  });
}
