var socket = null;
var isopen = false;
$('#btn-connect').on('click', function(){
  var $btn = $(this).button('loading');
  // check if the socket is already connected.
  if(isopen) {
    // then close it first.
    isopen = false;
    if(socket != null){
      socket.close();
      $btn.button('reset');
      $btn.removeClass('btn-success btn-danger').addClass("btn-primary");
      return;
    }
  }
  // get the websocket server ip and port
  server_ip = $('#txt-server-ip').val();
  server_port = $('#txt-server-port').val();
  // check if they are empty
  if(server_ip == "" || server_port == ""){
    alert("server ip or port should not be empty");
    return;
  }
  // init the web socket
  socket = new WebSocket("ws://" + server_ip + ":" + server_port);
  socket.binaryType = "arraybuffer";
  socket.onopen = function(){
    isopen = true;
    $btn.button('complete');
    $btn.removeClass("btn-primary btn-danger").addClass("btn-success");
  }
  
  socket.onerror = function(){
    isopen = false;
    socket = null;
    $btn.button('error');
    $btn.removeClass("btn-primary btn-success").addClass("btn-danger");
  }
  
  socket.onclose = function(){
    isopen = false;
    socket = null;
    $btn.button('reset');
    $btn.removeClass('btn-success btn-danger').addClass("btn-primary");
  }
  
  socket.onmessage = function(e){
    if(typeof e.data == "string"){
      console.log(e.data);
      var obj = JSON.parse(e.data);
      var cov = obj['E:\\projects\\gitlab\\biubiu\\regularbus\\client.py'];
      var exec = cov['executed'];
      var missing = cov['missed'];
      $.each(exec, function(i){
        $('.number' + exec[i]).removeClass('mis').addClass('run');
      });
      $.each(missing, function(i){
        $('.number' + missing[i]).removeClass('run').addClass('mis');
      });
    }
  }
});
SyntaxHighlighter.defaults['toolbar'] = false;
SyntaxHighlighter.defaults['quick-code'] = false;
SyntaxHighlighter.all();

$("#btn-send").on('click', function(){
  if(isopen && socket != null){
    socket.send("hello world");
  }
});



