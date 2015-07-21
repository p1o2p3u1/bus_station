$('.tree').treegrid();

$('.file_source').on('click', function(){
  alert($(this).attr('value'));
});