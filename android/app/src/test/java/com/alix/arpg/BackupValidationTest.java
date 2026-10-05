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
}
