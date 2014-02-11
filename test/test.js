test( "hello test", function() {
  ok( 1 == "1", "Passed!" );
});
test( "hello test fail", function() {
  ok( 1 == "2", "Failed!" );
});