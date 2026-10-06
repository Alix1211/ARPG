package com.alix.arpg;

import org.json.JSONObject;
import org.junit.Test;
import static org.junit.Assert.*;

public class BackupValidationTest {
    private String save() {
        return "{\"v\":3,\"t\":12345,\"lv\":7,\"gold\":987,\"hp\":4500,\"mp\":3400,\"stats\":{},\"bag\":[],\"eq\":{},\"stash\":[]}";
    }
    private String backup(String save) throws Exception {
        return new JSONObject().put("arpg_save_v3", save).put("arpg_audio_settings", "{\"sfx\":0.2}").toString();
    }
    private void rejected(String text) {
        try { MainActivity.validBackup(text); fail("invalid backup accepted"); }
        catch (Exception expected) { }
    }
    @Test public void preservesAllOriginalStrings() throws Exception {
        JSONObject result=MainActivity.validBackup(backup(save()));
        assertEquals(save(),result.getString("arpg_save_v3"));
        assertEquals("{\"sfx\":0.2}",result.getString("arpg_audio_settings"));
    }
    @Test public void rejectsWrongFileAndTypes() throws Exception {
        rejected("not json");rejected("{}");rejected("[]");
        rejected(backup(save().replace("\"v\":3","\"v\":2")));
        rejected(backup(save().replace("\"lv\":7","\"lv\":71")));
        rejected(backup(save().replace("\"lv\":7","\"lv\":7.5")));
        rejected(backup(save().replace("\"bag\":[]","\"bag\":{}")));
        rejected(new JSONObject().put("arpg_save_v3",new JSONObject(save())).toString());
        rejected(new JSONObject().put("arpg_save_v3",save()).put("another_app","{}").toString());
        rejected(backup(save())+" ".repeat(8000001));
    }
    @Test public void holdsNewerProgressFromAnotherDevice() throws Exception {
        JSONObject original=new JSONObject(backup(save()));
        JSONObject newer=new JSONObject(backup(save().replace("12345","12346")));
        assertTrue(MainActivity.newerBackup(newer,original));
        assertTrue(MainActivity.newerBackup(newer,new JSONObject()));
        assertFalse(MainActivity.newerBackup(original,newer));
        assertFalse(MainActivity.newerBackup(original,original));
    }
    @Test public void choosesNewestOfThreeStoresWithoutChangingTimestamp() throws Exception {
        JSONObject device=new JSONObject(backup(save()));
        JSONObject app=new JSONObject(backup(save().replace("12345","12346")));
        JSONObject drive=new JSONObject(backup(save().replace("12345","12347")));
        assertSame(drive,MainActivity.latestBackup(device,app,drive));
        assertSame(drive,MainActivity.latestBackup(drive,device,app));
        assertEquals(12347,MainActivity.saveTime(drive));
        assertSame(app,MainActivity.latestBackup(app,device)); // 오프라인
        assertSame(app,MainActivity.latestBackup(device,app,device)); // 더 오래된 Drive
        assertSame(app,MainActivity.latestBackup(app,new JSONObject(app.toString()))); // 동일 t
    }
    @Test public void brokenOrEmptyDriveFileIsTreatedAsMissingSoItCanBeRepaired() throws Exception {
        assertNull(MainActivity.parseRemote(""));
        assertNull(MainActivity.parseRemote("   "));
        assertNull(MainActivity.parseRemote(null));
        assertNull(MainActivity.parseRemote("{\"arpg_save_v3\":\"{\\\"v\\\":3,\\\"t\\\":")); // 쓰다 끊긴 파일
        assertNull(MainActivity.parseRemote(backup(save().replace("12345","-1"))));
        JSONObject ok=MainActivity.parseRemote(backup(save()));
        assertNotNull(ok);
        assertEquals(12345,MainActivity.saveTime(ok));
        // 깨진 파일(null)과 이 기기의 유효한 저장을 비교하면 항상 이 기기 저장이 선택된다(복구).
        JSONObject local=new JSONObject(backup(save()));
        assertSame(local,MainActivity.latestBackup(local,MainActivity.parseRemote("")));
        assertTrue(MainActivity.saveTime(local)>MainActivity.saveTime(null));
    }
    @Test public void invalidStoreCannotBeatValidProgress() throws Exception {
        JSONObject good=new JSONObject(backup(save()));
        JSONObject invalid=new JSONObject(backup(save().replace("\"lv\":7","\"lv\":71").replace("12345","99999")));
        assertSame(good,MainActivity.latestBackup(invalid,good,null));
        assertNull(MainActivity.latestBackup(invalid,new JSONObject()));
        rejected(backup(save().replace("12345","-1")));
        rejected(backup(save().replace("12345","\"99999\"")));
    }
}
