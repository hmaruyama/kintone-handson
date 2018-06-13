jQuery(function($) {
  "use strict";


  kintone.events.on(['app.record.detail.show'], function(event) {
    // 隠しパラメータ項目のDOMを削除
    $(".label-5125682").remove();
    $('div.field-5125682').parent().remove();
    $('div.field-5125682').parent().css('display', 'none');
    console.log("aaa");
    alert("aaa");
  });

  kintone.events.on(['app.record.edit.change.明細', 'app.record.create.change.明細', 'app.record.create.show', 'app.record.edit.show'], function(event) {

    // 隠しパラメータ項目のDOMを削除
    $(".label-5125682").remove();
    $(".field-5125682").remove();

    var table = event.record['明細'].value;
    for (var i = 0; i < table.length; i++) {
      table[i].value['隠しパラメータ'].disabled = true;
      if(table[i].value['入力方法'].value == "駅すぱあと") {
        table[i].value['経路'].disabled = true;
        table[i].value['金額'].disabled = true;
      }
    }
    return event;
  });

  kintone.events.on(['app.record.edit.change.入力方法', 'app.record.create.change.入力方法'], function(event) {

    var changeRow = event.changes.row;
    if(changeRow.value['入力方法'].value == "駅すぱあと") {
      // 編集中のテーブル行をマーク
      changeRow.value['隠しパラメータ'].value = "true";
    } else { // 入力方法 == "手入力" の場合
      changeRow.value['経路'].disabled = false;
      changeRow.value['金額'].disabled = false;
    }
    return event;
  });

  kintone.events.on(['app.record.edit.change.隠しパラメータ', 'app.record.create.change.隠しパラメータ'], function(event) {
    var changeRow = event.changes.row;
    if(changeRow.value['隠しパラメータ'].value) {

      var depStationPart;
      var arrStationPart;
      var courseResult;
      var inputOptions = {};
      var selectRoutes = {};
      var depStation = {};
      var arrStation = {};

      swal({
        title: "駅を入力してください",
        html:'出発<div id="input-dep-station"></div>到着<div id="input-arr-station"></div><div id="course-result" style="display:none;">',
        onOpen: function () {
          // 出発駅
          depStationPart = new expGuiStation(document.getElementById("input-dep-station"));
          depStationPart.setConfigure("ssl", true);
          depStationPart.dispStation();

          // 到着駅
          arrStationPart = new expGuiStation(document.getElementById("input-arr-station"));
          arrStationPart.setConfigure("ssl", true);
          arrStationPart.dispStation();

          // 探索結果
          courseResult = new expGuiCourse(document.getElementById("course-result"));
          courseResult.setConfigure("ssl", true);
        },
        preConfirm: function () {
          return new Promise(function (resolve) {
            depStation.code = depStationPart.getStationCode();
            arrStation.code = arrStationPart.getStationCode();
            if (!depStation.code || !arrStation.code) {
              swal.showValidationError("駅を選択してください。");
              resolve();
              return;
            }
            var searchObject = courseResult.createSearchInterface();
            searchObject.setAnswerCount(3);
            searchObject.setSearchType('plain');
            searchObject.setViaList(depStation.code + ':' + arrStation.code);
            courseResult.search(searchObject, function(isSuccess) {
              if(!isSuccess){
                swal.showValidationError("探索結果が取得できませんでした");
                resolve();
                return;
              }
              for (var i = 1; i <= courseResult.getResultCount(); i++) {
                courseResult.changeCourse(i);
                var onewayPrice = courseResult.getPrice(courseResult.PRICE_ONEWAY);
                var pointList = courseResult.getPointList().split(',');
                var lineList = courseResult.getLineList().split(',');
                var routeStr = "";
                for (var j = 0; j < pointList.length; j++) {
                  if (lineList[j]) {
                    routeStr += pointList[j] + " - [" + lineList[j] + "] - "
                  } else {
                    routeStr += pointList[j]
                  }
                }
                selectRoutes[String(i)] = {
                  route: routeStr,
                  price: onewayPrice
                }
                inputOptions[String(i)] = routeStr + " 片道" +  onewayPrice + "円";
              }
              resolve();
            });
          })
        }
      }).then(function (result) {
        if (!depStation.code || !arrStation.code) {

          // テーブル値の更新
          var rec = kintone.app.record.get();
          var tableRecord = rec.record['明細'].value;

          for(var i = 0; i < tableRecord.length; i++) {
            if(tableRecord[i].value['隠しパラメータ'].value == "true") {
              tableRecord[i].value['入力方法'].value = "手入力";
              tableRecord[i].value['隠しパラメータ'].value = "";
            }
          }
          kintone.app.record.set(rec);
          return;

        }
        swal({
          title: '経路を選択してください',
          input: 'radio',
          inputOptions: inputOptions,
          inputValidator: function(value) {
            return !value && "経路を選択してください。"
          }
        }).then(function (result) {
          if(!result.value){
            // テーブル値の更新
            var rec = kintone.app.record.get();
            var tableRecord = rec.record['明細'].value;

            for(var i = 0; i < tableRecord.length; i++) {
              if(tableRecord[i].value['隠しパラメータ'].value == "true") {
                tableRecord[i].value['入力方法'].value = "手入力";
                tableRecord[i].value['隠しパラメータ'].value = "";
              }
            }
            kintone.app.record.set(rec);
            return;

          }
          swal({
            title: '受け付けました！',
            type: "success"
          })

          // テーブル値の更新
          var rec = kintone.app.record.get();
          var tableRecord = rec.record['明細'].value;

          for(var i = 0; i < tableRecord.length; i++) {
            if(tableRecord[i].value['隠しパラメータ'].value == "true") {
              tableRecord[i].value['経路'].value = selectRoutes[result.value].route;
              tableRecord[i].value['金額'].value = selectRoutes[result.value].price;
              tableRecord[i].value['隠しパラメータ'].value = "";
              tableRecord[i].value['経路'].disabled = true;
              tableRecord[i].value['金額'].disabled = true;
            }
          }
          kintone.app.record.set(rec);
        })
      })
    }
  });
});
