var opTable = $('.table-user-jobs').dataTable();

$('#merge-test').on('click', function(){
  var checked = $('input:checkbox:checked');
  var job_ids = checked.map(function(){
    return $(this).attr('id');
  }).get();
  if(job_ids.length == 0){
    alert('请选择要合并的测单');
  } else if(job_ids.length == 1){
    alert('至少需要选择两个测单');
  } else {
    job_ids = job_ids.join(',');
    $.ajax({
      url: 'check_merge?list=' + job_ids,
      success: function(response){
        var result = response['result'];
        var html = "";
        for(var i=0; i<result.length; i++){
          html += '<tr><td>' + result[i]['filename'] + '</td>';
          html += '<td>' + result[i]['version'] + '</td>';
          html += '<td>' + result[i]['line'].length + '</td>';
          html += '<td>' + result[i]['exec'].length + '</td>';
          html += '<td>' + (parseFloat(result[i]['cov_result']) * 100).toFixed(2) + '%</td>';
        }
        $('#tb-test-result').html(html);
        $('#test-confirm-dialog').modal('show');
      }
    });
  }
});

$('#btn-confirm-test').on('click', function(){
  var new_name = $('#txt-test-name').val();
  var checked = $('input:checkbox:checked');
  var job_ids = checked.map(function(){
    return $(this).attr('id');
  }).get();
  if(new_name == ""){
    alert('名称不能为空');
  } else {
    data = {
      'name': new_name,
      'list': job_ids
    };
    $.ajax({
        url: '/merge',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(data),
        dataType: 'json',
        success: function (e) {  
          var job = e['job'];
          opTable.fnAddData([
            '<input type="checkbox" class="chk-job-merge" id="' + job['id'] + '">',
            job['id'],
            '<a href="report_detail.html?id=' + job['id']+ '" target="_blank">' + job['jobname'] + '</a>',
            job['username'],
            new Date(job['time']).toLocaleString()
          ]);
          // sort by id to display the new row on top
          opTable.fnSort([1, 'desc']);
          // uncheck all the checkboxes.
          $('input[type="checkbox"]').prop('checked', false);
        }
      });
      $('#test-confirm-dialog').modal('hide');
  }
});