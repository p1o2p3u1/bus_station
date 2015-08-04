var socket = null;
var isopen = false;
var path = "";
var file_tree_init = false;
var server_ip = "";
var server_port = "";
var btn_state = "stop"
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
    console.log("websocket connected");
    console.log(event);
    isopen = true;
    $btn.button('complete');
    $btn.removeClass("btn-primary btn-danger").addClass("btn-success");
  }
  
  socket.onerror = function(event){
    console.log("there is error");
    console.log(event);
    isopen = false;
    socket = null;
    $btn.button('error');
    $btn.removeClass("btn-primary btn-success").addClass("btn-danger");
  }
  
  socket.onclose = function(event){
    console.log("websocket closed");
    console.log(event);
    isopen = false;
    socket = null;
    $btn.button('reset');
    $btn.removeClass('btn-success btn-danger').addClass("btn-primary");
  }
  
    // list directories
  $.ajax({
    url: "http://" + server_ip + ":5000/list",
    jsonp: 'callback',
    dataType: "jsonp",
    jsonpCallback: "process_list_dir"
  });
  
  socket.onmessage = function(e){
    var selected_file = $('#source').attr('value');
    var obj = JSON.parse(e.data);
    show_coverage(obj);
    if(selected_file && selected_file != ""){
      var full_file_path = path + selected_file;
      var cov = obj[full_file_path];
      if(cov){
        var exec = cov['executed'];
        var missing = cov['missed'];
        var coverage = cov['coverage'];
        $.each(exec, function(i){
          $('.number' + exec[i]).removeClass('mis').addClass('run');
        });
        $.each(missing, function(i){
          $('.number' + missing[i]).removeClass('run').addClass('mis');
        });
        display_progress_bar(selected_file);
      }
    }
  }
  
});
SyntaxHighlighter.defaults['toolbar'] = false;
SyntaxHighlighter.defaults['quick-code'] = false;
SyntaxHighlighter.all();


function build_file_tree(parent, childs){
  var total_code_lines = 0;
  var html = "";
  for(var i=0; i<childs.length; i++){
    var class_value = "treegrid-" + childs[i][0];
    total_code_lines += childs[i][1];
    if(parent){
      class_value += " treegrid-parent-" + parent;
    }
    html += '<tr class="' + class_value +'">'
    html += '<td class="file-path"><span class="file_source" value="' + childs[i][0] + '">' + childs[i][0] + '</span></td>';
    html += '<td class="code-lines">' + childs[i][1] + '</td>'
    html += '<td class="run-lines">0</td>'
    if(parent){
      html += '<td class="file-cov parent-' + parent +' coverage_' + childs[i][0].replace(/[\./]/g, '_') + '" value="0">0%</td></tr>';
    } else {
      html += '<td class="file-cov coverage_' + childs[i][0].replace(/[\./]/g, '_') + '" value="0">0%</td></tr>';
    }
  }
  var parent_html = "";
  if(parent != null){
    parent_html += '<tr class="treegrid-' + parent +'">';
    parent_html += '<td class="file-path">' + parent + '</td>';
    parent_html += '<td class="total-code-lines">' + total_code_lines + '</td>';
    parent_html += '<td class="total-run-lines">0</td>';
    parent_html += '<td class="file-cov">0%</td></tr>';
  }
  return parent_html + html;
}

function process_list_dir(response){
  path = response['path'];
  var dirs = response['dirs'];
  var html = "";
  for(var i = 0; i<dirs.length; i++){
    var files = response[dirs[i]];
    html += build_file_tree(dirs[i], files);
  }
  var files = response['files'];
  html += build_file_tree(null, files);
  $('.tree').html(html);
  $('.tree').treegrid().treegrid('collapseAll');
  file_tree_init = true;
  $('.file_source').on('click', function(){
    var file_path = $(this).attr('value');
    display_progress_bar(file_path);
    file_path = encodeURIComponent(file_path);
    $.ajax({
      url: 'http://' + server_ip + ':5000/file?path=' + file_path,
      jsonp: 'callback',
      dataType: 'jsonp',
      jsonpCallback: 'process_file_source'
    });
  });
}

function process_file_source(response){
  var filename = response['filename'];
  filename = filename.replace(/\\/g, '/');
  var source = response['text'];
  $('#source').attr('value', filename);
  $('#source').html('<pre class="brush:python;">' + source + '</pre>');
  SyntaxHighlighter.highlight();
}

function show_coverage(data){
  if(data && file_tree_init){
    // display coverage data for each file
    $.each(data, function(key, value){
      var file = key.replace(path, '').replace(/[\./]/g, '_');
      var cov = (value.coverage * 100).toFixed(2);
      var run_lines = value.executed.length
      $('.coverage_' + file).attr('value', cov).text(cov + "%");
      $('.coverage_' + file).parent().children('td[class="run-lines"]').attr('value', run_lines).text(run_lines);
    });
    // display coverage data for each folder
    var rootNodes = $('.tree').treegrid('getRootNodes');
    $.each(rootNodes, function(i){
      var className = rootNodes[i].classList[0];
      var parent_id = $('.' + className).treegrid('getNodeId');
      var childs = $('.treegrid-parent-' + parent_id);
      var total_run_lines = 0;
      $.each(childs, function(){
        total_run_lines += parseInt($(this).children('td[class="run-lines"]').text());
      });
      $('.treegrid-' + parent_id).children('td[class="total-run-lines"]').text(total_run_lines);
      var total_code_lines = parseInt($('.treegrid-' + parent_id).children('td[class="total-code-lines"]').text());
      var avg_cov_parent = 0;
      if(childs.length > 0 && total_code_lines > 0){
        avg_cov_parent = (total_run_lines * 100.0 / total_code_lines).toFixed(2);
      }
      $('.treegrid-' + parent_id).children('td[class="file-cov"]').text(avg_cov_parent + "%");
    });
  }
}

$("#menu-toggle").click(function(e) {
  e.preventDefault();
  $("#wrapper").toggleClass("toggled");
});

function display_progress_bar(filename){
  var filepath = filename.replace(/[\./]/g, '_');
  var cov = $('.coverage_' + filepath).attr("value");
  var html = '<div class="progress-bar progress-bar-success" role="progressbar" aria-valuenow="' + cov + '" ';
  html += 'aria-valuemin="0" aria-valuemax="100" style="width:' + cov + '%">';
  html += cov + '% Complete ' + filename + '</div>';
  $('#source-progress').html(html);
}

$('[data-toggle="tooltip"]').tooltip();

$('#button_play').on('click', function(){
  if(btn_state == "stop"){
    btn_state = "play";
    $('#button_play > i').attr('class', 'icon-pause');
    $('#button_play').attr('class', 'btn btn-success');
    sendMessage(JSON.stringify({
      "op": "start"
    }));
  } else if(btn_state == "play" || btn_state == "resume"){
    btn_state = "pause";
    $('#button_play > i').attr('class', 'icon-play');
    sendMessage(JSON.stringify({
      "op": "pause"
    }));
  } else if(btn_state == "pause"){
    btn_state = "resume";
    $('#button_play > i').attr('class', 'icon-pause');
    sendMessage(JSON.stringify({
      "op": "resume"
    }));
  }
});

$('#button_stop').on('click', function(){
  btn_state = "stop";
  $('#button_play').attr('class', 'btn btn-default');
  $('#button_play > i').attr('class', 'icon-play');
  sendMessage(JSON.stringify({
    "op": "stop"
  }));
});


function sendMessage(message){
  if(isopen && socket != null){
    socket.send(message);
  }
}

$('#test').on('click', function(){
  var ms = JSON.stringify({
    "op": "add",
    "files": ["/User/Ting/a.py"]
  });
  sendMessage(ms);
});

$('#start_trace').on('click', function(){
  sendMessage(JSON.stringify({
    "op": "start_trace"
  }));
});

$('#clear_trace').on('click', function(){
  sendMessage(JSON.stringify({
    "op": "clear"
  }));
});

$('#stop_trace').on('click', function(){
  sendMessage(JSON.stringify({
    "op": "stop_trace"
  }));
});

