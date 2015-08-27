var isopen = false;
var server_ip = "";
var server_port = "";
function addEvent(){
  
  // $('.table').DataTable();
  
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
    // init the web socket, however we can not try-cache the connection error
    // I've googled for a while but doesn't find a solution, damn it!

    socket = new WebSocket("ws://" + server_ip + ":" + server_port);

    socket.binaryType = "arraybuffer";
    socket.onopen = function(event){
      isopen = true;
      $btn.button('complete');
      $btn.removeClass("btn-primary btn-danger").addClass("btn-success");
      sendMessage({
        "op": "start graph"
      });
    }

    socket.onerror = function(event){
      isopen = false;
      socket = null;
      $btn.button('error');
      $btn.removeClass("btn-primary btn-success").addClass("btn-danger");
    }

    socket.onclose = function(event){
      isopen = false;
      socket = null;
      $btn.button('reset');
      $btn.removeClass('btn-success btn-danger').addClass("btn-primary");
    }

    socket.onmessage = function(e){
      if (typeof e.data == "string") {
        var obj = JSON.parse(e.data);
        build_table(obj);
      } else {
        var arr = new Uint8Array(e.data);
        var image = btoa(String.fromCharCode.apply(null, arr));
        var html = '<img src="data:image/png;base64,' + image + '" />'
        $('#graph').html(html);
      }
    }
    
    $('#btn-clear').on('click', function(){
      sendMessage({
        "op": "clear graph"
      });
    });

  });
  
  $("#menu-toggle").click(function(e) {
    e.preventDefault();
    $("#wrapper").toggleClass("toggled");
  });

  $('[data-toggle="tooltip"]').tooltip();
}

addEvent();

function sendMessage(message){
  if(isopen && socket != null){
    if(typeof message == "object"){
      socket.send(JSON.stringify(message));
    } else {
      socket.send(message);
    }
  }
}

function build_table(data){
  nodes = data['nodes'];
  /*
  nodes = nodes.sort(function(a, b){
    return b['avg'] - a['avg'] ;
  }); */
  var html = "";
  for(var i=0; i<nodes.length; i++){
    html += '<tr><td title="' + nodes[i]['name'] + '">' + nodes[i]['name'] + '</td>';
    html += '<td>' + nodes[i]['calls'] + '</td>';
    html += '<td>' + nodes[i]['time'] + '</td>';
    html += '<td>' + nodes[i]['avg'] + '</td></tr>';
  }
  $('#tb-call-detail').html(html);
}