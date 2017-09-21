$(document).ready(function() {

  // auto clear message boxes after 3s
  window.setTimeout(function() {
    $('.alert .close').click();
  }, 3000);
  
  $('button.del').on('click', function() {
    var mid = $(this).data('mid');
    var row = $(this).parent().parent();
    $.ajax({
      url: '/matches/' + mid,
      method: 'delete'
    }).done(function(res) {
      console.log('done', res);
      row.fadeOut(1000);
    }).fail(function(e) {
      console.log('problem', e);
      alert('Sorry, there was a problem deleting that match');
    })

  });

  $('#addMatch').on('focusout', function(e) {
    // catch any bubbled focusout (blur) events from form, and check for compliance
    addMatchCheck();
  });

  $('#leagueDelete').on('click', function() {
    var lid = $(this).data('lid');
    $.ajax({
      url: '/leagues/' + lid,
      method: 'delete'
    }).done(function(res) {
      console.log(res);
      if (res.deleted == true) {
        window.location.href = '/leagues/';
      } else {
        alert('Could not delete league');
      }
      // redirect to league index
    }).fail(function(e) {
      console.log(e);
    })
  })

  $('#teamDelete').on('click', function() {
    var lid = $(this).data('tid');
    $.ajax({
      url: '/teams/' + lid,
      method: 'delete'
    }).done(function(res) {
      console.log(res);
      if (res.deleted == true) {
        window.location.href = '/teams/';
      } else {
        alert('Could not delete team');
      }
      // redirect to league index
    }).fail(function(e) {
      console.log(e);
    })
  })

  $('#deleteMatch').on('click', function() {
    var mid = $(this).data('mid'),
        week = $(this).data('week');
    $.ajax({
      url: '/matches/' + mid,
      method: 'DELETE'
    }).done(function(res) {
      alert('Match ' + mid + ' has been deleted');
      window.location.href = '/weeks/' + week;
    }).fail(function(res) {
      alert('Sorry, there was a problem trying to delete this match');
    })
  });

  var addMatchCheck = function() {
    var form  = $('#addMatch'),
        check = false;

    // check both teams and leagues populated
    check = ($('#addMatchHomeId').val() != '' && $('#addMatchAwayId').val() != '' && $('#addMatchLeagueId').val() != '');
    // check at least one of goalmine or tipping games is selected
    check = check && ($('#gm-check').is(':checked') || $('#tp-check').is(':checked'));

    if ($('#tp-check').is(':checked') && ($('#addMatchOdds1').val() == '' || $('#addMatchOdds2').val() == '' || $('#addMatchOddsX').val() == '')) {
      check = false;
    }

    if (check) {
      $('#addMatchSubmit').removeAttr('disabled');
    } else {
      $('#addMatchSubmit').attr('disabled', 'disabled');
    }
  }    

  $('#addMatchHome').easyAutocomplete({
    url: function(phrase) {
      return '/teams/find/' + phrase
    },
    getValue: 'name',
    list: {
      onSelectItemEvent: function() {
        var id = $('#addMatchHome').getSelectedItemData().id;
        $('#addMatchHomeId').val(id);
      }
    }
  }).on('blur', function() {
    if ($(this).getSelectedItemData() == -1) {
      $(this).val('');
      $('#addMatchHomeId').val('');
    }        
  })

  $('#addKillerHome').easyAutocomplete({
    url: function(phrase) {
      var kid = $('#addKillerKid').val();
      var uid = $('#addKillerUid').val();
      var uri = '/teams/find/' + phrase + '?kid=' + kid + '&uid=' + uid;
      return uri; 
    },
    getValue: 'name',
    list: {
      onSelectItemEvent: function() {
        var id = $('#addKillerHome').getSelectedItemData().id;
        $('#addKillerHomeId').val(id);
      }
    }
  }).on('blur', function() {
    if ($(this).getSelectedItemData() == -1) {
      $(this).val('');
      $('#addKillerHomeId').val('');
    }        
  })

  $('#addMatchAway').easyAutocomplete({
    url: function(phrase) {
      return '/teams/find/' + phrase
    },
    getValue: 'name',
    list: {
      onSelectItemEvent: function() {
        var id = $('#addMatchAway').getSelectedItemData().id;
        $('#addMatchAwayId').val(id);
      }
    }
  }).on('blur', function() {
    if ($(this).getSelectedItemData() == -1) {
      $(this).val('');      
      $('#addMatchAwayId').val('');
    }      
  })

  $('#addKillerAway').easyAutocomplete({
    url: function(phrase) {
      var kid = $('#addKillerKid').val();
      var uid = $('#addKillerUid').val();
      var uri = '/teams/find/' + phrase + '?kid=' + kid + '&uid=' + uid;
      return uri; 
    },
    getValue: 'name',
    list: {
      onSelectItemEvent: function() {
        var id = $('#addKillerAway').getSelectedItemData().id;
        $('#addKillerAwayId').val(id);
      }
    }
  }).on('blur', function() {
    if ($(this).getSelectedItemData() == -1) {
      $(this).val('');
      $('#addKillerAwayId').val('');
    }        
  })

  $('#addMatchLeague').easyAutocomplete({
    url: function(phrase) {
      return '/leagues/find/' + phrase
    },
    getValue: 'name',
    list: {
      onSelectItemEvent: function() {
        var id = $('#addMatchLeague').getSelectedItemData().id;
        $('#addMatchLeagueId').val(id);          
      }
    }
  }).on('blur', function() {
    if ($(this).getSelectedItemData() == -1) {
      $(this).val('');      
      $('#addMatchLeagueId').val('');
    }
  });

  $('#teamCountry').easyAutocomplete({
    url: '/js/countries.json',
    getValue: 'name',
    list: {      
      match: {
        enabled: true
      },
      maxNumberOfElements: 8,
      onSelectItemEvent: function() {
        var id = $('#teamCountry').getSelectedItemData().code;
        $('#countryCode').val(id);
      }
    },
    template: {
      type: 'custom',
      method: function(value, item) {
        return "<span class='flag " + (item.code) + "' ></span>" + value;
      }
    }
  }).on('blur', function() {
    if ($(this).getSelectedItemData() == -1) {
      $(this).val('');      
      $('#countryCode').val('');
    }    
  });

  $('#leagueCountry').easyAutocomplete({
    url: '/js/countries.json',
    getValue: 'name',
    list: {
      match: {
        enabled: true
      },
      maxNumberOfElements: 8,
      onSelectItemEvent: function() {
        var id = $('#leagueCountry').getSelectedItemData().code;
        $('#countryCode').val(id);
      }
    },
    template: {
      type: 'custom',
      method: function(value, item) {
        return "<span class='flag " + (item.code).toLowerCase() + "' ></span>" + value;
      }
    }
  }).on('blur', function() {
    if ($(this).getSelectedItemData() == -1) {
      $(this).val('');      
      $('#countryCode').val('');
    }    
  });

  $('#addMatchGotw').on('click', function() {
    if ($(this).is(':checked')) {
      $('#gm-check').prop('checked', true);
    }
  });

  $('#tp-check').on('click', function() {
    if ($(this).is(':checked')) {
      $('[name^="odds"]').removeAttr('disabled');
      $('#addMatchLeagueId').val(1);
      $('#addMatchLeague').val('Premier League');
    } else {
      $('[name^="odds"]').attr('disabled', 'disabled');
    }
  });

  $('#addMatch').on('submit', function() {
    $.get({
      url: '/matches/duplicate',
      data: { ta: $('#addMatchHomeId').val(), tb: $('#addMatchAwayId').val(), dt: $('#addMatchDate').val() }
    }).done(function(res) {
      console.log(res);
    })

  })

  $('#outstanding :text').on('change', function() {

    var pred = $(this),
        row = pred.closest('tr');

    row.removeClass('ajaxChange');
    $.post('/admin/match/update', {
      mid: pred.data('mid'),
      result: pred.val()
    }).done(function(res) {
      row.addClass('ajaxChange');
      console.log(res);
      // TODO remove row from table
    }).fail(function(err) {
      row.removeClass('ajaxChange');
      pred.val('');
    })
  })

  $('#proposedTeam').on('keyup', function() {

    var team_dup = $('#team-dup'),
        submit = $('#addTeam');
    var box = $(this);
    if (box.val().length > 2) {
      $.get('/teams/available/' + box.val())
        .done(function(res) {
          if (res) {
            team_dup.addClass('success').removeClass('err').html('√').show();
            submit.removeAttr('disabled');
          } else {
            team_dup.addClass('err').removeClass('success').html('exists').show();
            submit.attr('disabled', 'disabled');
          }
        })
    } else {
      team_dup.hide();
    }

  });

  $('#proposedLeague').on('keyup', function() {

    var league_dup = $('#league-dup'),
        submit = $('#addLeague');
    var box = $(this);
    if (box.val().length > 2) {
      $.get('/leagues/available/' + box.val())
        .done(function(res) {
          if (res) {
            league_dup.addClass('success').removeClass('err').html('√').show();
            submit.removeAttr('disabled');
          } else {
            league_dup.addClass('err').removeClass('success').html('exists').show();
            submit.attr('disabled', 'disabled');
          }
        })
    } else {
      league_dup.hide();
    }

  })

  var checkResetForm = function() {
    var pwd_val = $('#password-val'),
        rpt_val = $('#rpt-val'),
        state = (pwd_val.hasClass('success') && rpt_val.hasClass('success'));

    if (state) {
      $('#reset-submit').removeAttr('disabled');
    } else {
      $('#reset-submit').attr('disabled', 'disabled');
    }
  };

  $('#resetpwd').on('blur', function() {
    var fld = $(this).val();
    if (fld.length >= 8) {
        $('#password-val')
          .removeClass('err')
          .addClass('success')
          .html('&#10003;')
          .show();
    } else {
        $('#password-val')
          .removeClass('success')
          .addClass('err')
          .text('!!')
          .show();
    }
    checkResetForm();
  })
  $('#rpt').on('keyup', function() {
    var fld = $(this).val();
    var pwd = $('#resetpwd').val();
    if (fld == pwd) {
        $('#rpt-val')
          .removeClass('err')
          .addClass('success')
          .html('&#10003;')
          .show();
    } else {
        $('#rpt-val')
          .removeClass('success')
          .addClass('err')
          .html('&ne;')
          .show();
    } 
    checkResetForm();     
  })

  $('#sendPreview').on('click', function() {
    $.post({
      url: '/posts/preview',
      data: {
        body: $('#sendBody').val()
      }
    }).done(function(res) {
      $('#sendPreviewPane').html(res);
    })
  })

  $('#postPreview').on('click', function() {
    $.post({
      url: '/posts/preview',
      data: {
        body: $('#postAddBody').val()
      }
    }).done(function(res) {
      $('#postPreviewPane').html(res);
    })
  })

  $('#predTable .score').on('change', function() {
    var t = $(this);
    var uid = $('#preds').data('uid');
    t.parent().removeClass('ajaxChange');
    var mid = t.data('mid') || t.parent().parent().data('mid');
    $.post({
      url: '/predictions/update',
      data: {
        pid: t.data('pid'),
        mid: mid,
        uid: uid,
        pred: t.val()
      }
    }).done(function(res) {
      t.parent().addClass('ajaxChange');
      console.log(res);
    }).fail(function(res) {
      console.log(res);
    })
  })

  $('#predTable input:radio').on('click', function() {
    var t = $(this);
    var uid = $('#preds').data('uid');
    var wid = $('#preds').data('week');
    var mid = t.data('mid') || t.parent().parent().data('mid');
    $.post({
      url: '/predictions/joker',
      data: {
        uid: uid,
        week: wid,
        mid: mid
      }
    }).done(function(res) {
      console.log(res);
    }).fail(function(res) {
      console.log(res);
    })
  })

  $('.postfooter span > span').on('click', function() {
    var icon = $(this);
    var post = icon.parent().parent().parent().parent();
    if (icon.attr('title') == 'edit') {
      console.log(post.data('postid'));
    } else if (icon.attr('title') == 'delete') {
      if (window.confirm('Please confirm you wish to delete that post')) {
        $.ajax({
          url: '/posts/' + post.data('postid'),
          method: 'delete',
        }).done(function (res) {
          console.log(res);
          post.fadeOut(1000);
        })        
      }
    }
  })

  $('#scoreUpdateButton').on('click', function() {
    $('#scoreUpdate').toggle();
  })

  $('#scoreUpdate :text').on('change', function() {
    var pred = $(this);
    $.post('/admin/match/update', {
      mid: pred.data('mid'),
      result: pred.val()
    }).done(function(res) {
      pred.parent().addClass('ajaxChange');
      console.log(res);
      // TODO remove row from table
    }).fail(function(err) {
      pred.parent().removeClass('ajaxChange');
      pred.val('');
    })    
  })

})
