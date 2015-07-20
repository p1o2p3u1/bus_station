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
    $btn.button('error');btn-danger
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
      var obj = JSON.parse(e.data);
      var cov = obj['E:\\projects\\gitlab\\biubiu\\regularbus\\client.py'];
    }
      
  }
});

$("#btn-send").on('click', function(){
  if(isopen && socket != null){
    socket.send("hello world");
  }
});
var executed = [1, 3, 5, 7, 9, 11, 13, 15, 17, 19];
$.each(executed, function(i){
  $('.number' + executed[i]).addClass('run');
});

SyntaxHighlighter.all();