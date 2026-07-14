import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:parentconnect/main.dart';

void main() {
  testWidgets('app renders the scaffold home', (WidgetTester tester) async {
    await tester.pumpWidget(const ParentConnectApp());

    expect(find.text('ParentConnect'), findsOneWidget);
    expect(find.textContaining('Scaffold only'), findsOneWidget);
  });
}
