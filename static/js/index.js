var socket = null;
var isopen = false;
var path = "";
var file_tree_init = false;
var server_ip = "";
var server_port = "";
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
  
    // list directories
  $.ajax({
    url: "http://" + server_ip + ":8777/list",
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
  var html = "";
  if(parent != null){
    html += '<tr class="treegrid-' + parent +'">';
    html += '<td class="file-path">' + parent + '</td>';
    html += '<td class="file-cov coverage-' + parent + '">0%</td></tr>';
  }
    for(var i=0; i<childs.length; i++){
      var class_value = "treegrid-" + childs[i];
      if(parent){
        class_value += " treegrid-parent-" + parent;
      }
      html += '<tr class="' + class_value +'">'
      html += '<td class="file-path"><span class="file_source" value="' + childs[i] + '">' + childs[i] + '</span></td>';
      if(parent){
        html += '<td class="file-cov parent-' + parent +' coverage_' + childs[i].replace(/[\./]/g, '_') + '" value="0">0%</td></tr>';
      } else {
        html += '<td class="file-cov coverage_' + childs[i].replace(/[\./]/g, '_') + '" value="0">0%</td></tr>';
      }
    }
  return html;
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
      url: 'http://' + server_ip + ':8777/file?path=' + file_path,
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
    $.each(data, function(key, value){
      var file = key.replace(path, '').replace(/[\./]/g, '_');
      var cov = (value.coverage * 100).toFixed(2);
      $('.coverage_' + file).attr('value', cov);
      $('.coverage_' + file).text(cov + "%");
      var rootNodes = $('.tree').treegrid('getRootNodes');
      $.each(rootNodes, function(i){
        var className = rootNodes[i].classList[0];
        var parent_id = $('.' + className).treegrid('getNodeId');
        var childs = $('.parent-' + parent_id);
        var total_cov_parent = 0;
        $.each(childs, function(){
          total_cov_parent += parseFloat($(this).attr('value'));
        });
        var avg_cov_parent = 0;
        if(childs.length > 0){
          var avg_cov_parent = (total_cov_parent / childs.length).toFixed(2);
        }
        if(!avg_cov_parent) avg_cov_parent = 0;
        $('.coverage-' + parent_id).attr('value', avg_cov_parent);
        $('.coverage-' + parent_id).text(avg_cov_parent + "%");
      });
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

$('[data-toggle="tooltip"]').tooltip()